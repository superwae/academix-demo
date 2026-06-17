using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using AcademixLMS.API.Middleware;
using AcademixLMS.Application.DTOs.Audit;
using AcademixLMS.Application.Interfaces;

namespace AcademixLMS.API.Filters;

/// <summary>
/// Logs controller action entry and exit with full context (action, route, parameters).
/// </summary>
public class ActionLoggingFilter : IAsyncActionFilter
{
    private readonly ILogger<ActionLoggingFilter> _logger;
    private readonly IAuditLogService _auditLogService;
    private static readonly string[] SensitiveParamNames = ["password", "token", "secret", "key", "authorization"];

    public ActionLoggingFilter(ILogger<ActionLoggingFilter> logger, IAuditLogService auditLogService)
    {
        _logger = logger;
        _auditLogService = auditLogService;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var actionName = context.ActionDescriptor.RouteValues["action"] ?? "Unknown";
        var controllerName = context.ActionDescriptor.RouteValues["controller"] ?? "Unknown";
        var correlationId = context.HttpContext.Items["CorrelationId"]?.ToString() ?? "-";

        // Log action entry with route data and parameters (sanitized)
        var routeData = context.RouteData.Values
            .Where(x => x.Value != null)
            .ToDictionary(x => x.Key, x => x.Value?.ToString() ?? "");
        var safeParams = SanitizeParameters(context.ActionArguments);

        _logger.LogInformation(
            "[CONTROLLER ENTRY] {CorrelationId} | {Controller}.{Action} | " +
            "Route: {RouteData} | Params: {Params} | User: {User}",
            correlationId,
            controllerName,
            actionName,
            JsonSerializer.Serialize(routeData),
            JsonSerializer.Serialize(safeParams),
            RequestLoggingMiddleware.GetUserIdentity(context.HttpContext));

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var executed = await next();
        sw.Stop();

        var resultType = executed.Result switch
        {
            OkResult => "Ok",
            OkObjectResult => "Ok",
            CreatedResult => "Created",
            CreatedAtActionResult => "CreatedAtAction",
            BadRequestResult => "BadRequest",
            BadRequestObjectResult => "BadRequest",
            NotFoundResult => "NotFound",
            NotFoundObjectResult => "NotFound",
            UnauthorizedResult => "Unauthorized",
            UnauthorizedObjectResult => "Unauthorized",
            _ => executed.Result?.GetType().Name ?? "Unknown"
        };

        var logLevel = executed.Exception != null ? LogLevel.Error
            : executed.Result is BadRequestResult or BadRequestObjectResult or NotFoundResult or UnauthorizedResult
                ? LogLevel.Warning
                : LogLevel.Information;

        _logger.Log(logLevel,
            "[CONTROLLER EXIT] {CorrelationId} | {Controller}.{Action} | " +
            "Result: {ResultType} | Duration: {Duration}ms | Exception: {Exception}",
            correlationId,
            controllerName,
            actionName,
            resultType,
            sw.ElapsedMilliseconds,
            executed.Exception?.Message ?? "-");

        if (ShouldPersistAudit(context, controllerName, actionName))
        {
            await _auditLogService.RecordAsync(new AuditLogCreateDto
            {
                Action = BuildActionKey(controllerName, actionName),
                Category = ResolveCategory(controllerName, actionName),
                ActorEmail = ResolveActorEmail(context),
                ActorRole = ResolveActorRole(context),
                ActorUserId = ResolveActorUserId(context),
                Target = ResolveTarget(context, controllerName, actionName),
                Description = BuildDescription(controllerName, actionName, resultType, executed.Exception),
                IpAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "-",
                Method = context.HttpContext.Request.Method,
                Path = context.HttpContext.Request.Path.Value ?? string.Empty,
                Status = ResolveAuditStatus(executed, context.HttpContext.Response.StatusCode),
                StatusCode = context.HttpContext.Response.StatusCode,
                CorrelationId = correlationId,
                DurationMs = sw.ElapsedMilliseconds
            }, context.HttpContext.RequestAborted);
        }
    }

    private static Dictionary<string, object?> SanitizeParameters(IDictionary<string, object?> args)
    {
        if (args == null || args.Count == 0)
            return new Dictionary<string, object?>();

        var safe = new Dictionary<string, object?>();
        foreach (var (key, value) in args)
        {
            var lower = key.ToLowerInvariant();
            if (SensitiveParamNames.Any(s => lower.Contains(s)))
                safe[key] = "***";
            else if (value != null && value.GetType().IsClass && value.GetType() != typeof(string))
                safe[key] = $"[{value.GetType().Name}]";
            else
                safe[key] = value;
        }
        return safe;
    }

    private static bool ShouldPersistAudit(ActionExecutingContext context, string controllerName, string actionName)
    {
        var method = context.HttpContext.Request.Method.ToUpperInvariant();
        if (controllerName is "Health" or "AuditLogs")
            return false;

        if (controllerName == "Auth")
        {
            return actionName.Contains("Login", StringComparison.OrdinalIgnoreCase) ||
                   actionName.Contains("Logout", StringComparison.OrdinalIgnoreCase) ||
                   actionName.Contains("Register", StringComparison.OrdinalIgnoreCase) ||
                   actionName.Contains("Password", StringComparison.OrdinalIgnoreCase) ||
                   actionName.Contains("Verify", StringComparison.OrdinalIgnoreCase);
        }

        if (method == "GET")
            return controllerName is "Payments";

        return controllerName is
            "Courses" or
            "Enrollments" or
            "Users" or
            "Payments" or
            "Organizations" or
            "CourseLicenses" or
            "SubscriptionPlans" or
            "Subscriptions" or
            "SupportTickets";
    }

    private static string BuildActionKey(string controllerName, string actionName)
    {
        return $"{ToKebab(controllerName.Replace("Controller", string.Empty))}.{ToKebab(actionName)}";
    }

    private static string ResolveCategory(string controllerName, string actionName)
    {
        return controllerName switch
        {
            "Auth" or "Users" => "user",
            "Courses" or "Lessons" or "Assignments" or "Exams" => "course",
            "Payments" or "Finance" or "Subscriptions" or "SubscriptionPlans" or "CourseLicenses" => "payment",
            "Organizations" => "organization",
            "SupportTickets" => "support",
            _ when actionName.Contains("Setting", StringComparison.OrdinalIgnoreCase) => "settings",
            _ => "system"
        };
    }

    private static string ResolveActorEmail(ActionExecutingContext context)
    {
        var email = context.HttpContext.User.FindFirstValue(ClaimTypes.Email);
        if (!string.IsNullOrWhiteSpace(email))
            return email;

        foreach (var value in context.ActionArguments.Values)
        {
            var prop = value?.GetType().GetProperty("Email");
            var propValue = prop?.GetValue(value)?.ToString();
            if (!string.IsNullOrWhiteSpace(propValue))
                return propValue;
        }

        return context.HttpContext.User.Identity?.IsAuthenticated == true ? "authenticated-user" : "anonymous";
    }

    private static string ResolveActorRole(ActionExecutingContext context)
    {
        var roles = context.HttpContext.User.FindAll(ClaimTypes.Role).Select(x => x.Value).ToList();
        return roles.Count > 0 ? string.Join(", ", roles) : "Anonymous";
    }

    private static Guid? ResolveActorUserId(ActionExecutingContext context)
    {
        var id = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(id, out var userId) ? userId : null;
    }

    private static string ResolveTarget(ActionExecutingContext context, string controllerName, string actionName)
    {
        foreach (var key in new[] { "id", "courseId", "userId", "orgId", "licenseId", "ticketId" })
        {
            if (context.RouteData.Values.TryGetValue(key, out var routeValue) && routeValue != null)
                return routeValue.ToString() ?? controllerName;
        }

        foreach (var value in context.ActionArguments.Values)
        {
            var email = value?.GetType().GetProperty("Email")?.GetValue(value)?.ToString();
            if (!string.IsNullOrWhiteSpace(email))
                return email;

            var title = value?.GetType().GetProperty("Title")?.GetValue(value)?.ToString();
            if (!string.IsNullOrWhiteSpace(title))
                return title;
        }

        return $"{controllerName}.{actionName}";
    }

    private static string BuildDescription(string controllerName, string actionName, string resultType, Exception? exception)
    {
        if (exception != null)
            return $"{controllerName}.{actionName} failed: {exception.Message}";

        return $"{controllerName}.{actionName} completed with {resultType}.";
    }

    private static string ResolveAuditStatus(ActionExecutedContext executed, int statusCode)
    {
        if (executed.Exception != null || statusCode >= 500)
            return "error";

        if (statusCode >= 400)
            return "warning";

        return "success";
    }

    private static string ToKebab(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var chars = new List<char>(value.Length + 8);
        for (var i = 0; i < value.Length; i++)
        {
            var c = value[i];
            if (char.IsUpper(c) && i > 0 && chars[^1] != '-')
                chars.Add('-');
            chars.Add(char.ToLowerInvariant(c));
        }

        return new string(chars.ToArray()).Replace("--", "-");
    }
}
