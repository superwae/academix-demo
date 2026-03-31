using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using AcademixLMS.API.Middleware;

namespace AcademixLMS.API.Filters;

/// <summary>
/// Logs controller action entry and exit with full context (action, route, parameters).
/// </summary>
public class ActionLoggingFilter : IAsyncActionFilter
{
    private readonly ILogger<ActionLoggingFilter> _logger;
    private static readonly string[] SensitiveParamNames = ["password", "token", "secret", "key", "authorization"];

    public ActionLoggingFilter(ILogger<ActionLoggingFilter> logger)
    {
        _logger = logger;
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
}
