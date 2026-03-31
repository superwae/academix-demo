using System.Diagnostics;
using System.Security.Claims;
using Serilog.Context;

namespace AcademixLMS.API.Middleware;

/// <summary>
/// Middleware that logs all HTTP requests and responses with full structured data
/// for complete visibility across the system.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    private static readonly string[] ExcludedPaths = ["/health", "/favicon.ico", "/swagger", "/_framework"];
    private static readonly string[] SensitiveHeaders = ["authorization", "cookie", "x-api-key", "x-auth-token"];

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
            ?? Guid.NewGuid().ToString("N")[..12];
        context.Response.Headers.Append("X-Correlation-ID", correlationId);
        context.Items["CorrelationId"] = correlationId;

        // Push CorrelationId to Serilog LogContext so ALL downstream logs inherit it
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            var stopwatch = Stopwatch.StartNew();
            var requestPath = context.Request.Path.Value ?? "/";
            var isExcluded = ExcludedPaths.Any(p => requestPath.StartsWith(p, StringComparison.OrdinalIgnoreCase));

            if (!isExcluded)
            {
                _logger.LogInformation(
                    "[HTTP REQUEST] {CorrelationId} | {Method} {Scheme}://{Host}{Path}{Query} | " +
                    "User: {User} | IP: {ClientIp} | UserAgent: {UserAgent} | " +
                    "ContentType: {ContentType} | ContentLength: {ContentLength} | " +
                    "Accept: {Accept} | Referer: {Referer} | TraceId: {TraceId} | " +
                    "Headers: {Headers}",
                    correlationId,
                    context.Request.Method,
                    context.Request.Scheme,
                    context.Request.Host,
                    requestPath,
                    context.Request.QueryString.HasValue ? context.Request.QueryString.Value : "",
                    GetUserIdentity(context),
                    GetClientIp(context),
                    context.Request.Headers.UserAgent.ToString(),
                    context.Request.ContentType ?? "-",
                    context.Request.ContentLength?.ToString() ?? "-",
                    context.Request.Headers.Accept.ToString(),
                    context.Request.Headers.Referer.ToString(),
                    Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier,
                    GetSafeHeaders(context.Request.Headers));
            }

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                var statusCode = context.Response.StatusCode;
                var logLevel = statusCode >= 500 ? LogLevel.Error
                    : statusCode >= 400 ? LogLevel.Warning
                    : LogLevel.Information;

                if (!isExcluded)
                {
                    var responseContentType = context.Response.ContentType ?? "-";
                    var responseContentLength = context.Response.ContentLength?.ToString() ?? "-";

                    _logger.Log(logLevel,
                        "[HTTP RESPONSE] {CorrelationId} | {Method} {Path} | Status: {StatusCode} | " +
                        "Duration: {Duration}ms | ContentType: {ContentType} | ContentLength: {ContentLength} | " +
                        "User: {User} | Completed",
                        correlationId,
                        context.Request.Method,
                        requestPath,
                        statusCode,
                        stopwatch.ElapsedMilliseconds,
                        responseContentType,
                        responseContentLength,
                        GetUserIdentity(context));
                }
            }
        }
    }

    private static string GetSafeHeaders(IHeaderDictionary headers)
    {
        var safe = new List<string>();
        foreach (var (key, value) in headers)
        {
            var lower = key.ToLowerInvariant();
            if (SensitiveHeaders.Any(h => lower.Contains(h)))
                safe.Add($"{key}=***");
            else
                safe.Add($"{key}={value}");
        }
        return string.Join("; ", safe);
    }

    public static string GetUserIdentity(HttpContext context)
    {
        var user = context.User;
        if (user?.Identity?.IsAuthenticated != true)
            return "Anonymous";

        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value
            ?? "?";
        var email = user.FindFirst(ClaimTypes.Email)?.Value
            ?? user.FindFirst("email")?.Value
            ?? "";
        var role = user.FindFirst(ClaimTypes.Role)?.Value
            ?? user.FindFirst("role")?.Value
            ?? "";

        return string.IsNullOrEmpty(email)
            ? $"UserId:{userId}"
            : $"{email} ({role})";
    }

    public static string GetClientIp(HttpContext context)
    {
        return context.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            ?? context.Request.Headers["X-Real-IP"].FirstOrDefault()
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
    }
}
