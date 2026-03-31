using System.Net;
using System.Text.Json;
using AcademixLMS.Application.Common;
using Microsoft.Extensions.Hosting;

namespace AcademixLMS.API.Middleware;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlerMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var correlationId = context.Items["CorrelationId"]?.ToString() ?? "unknown";
            _logger.LogError(ex,
                "[{CorrelationId}] Unhandled exception | Path: {Path} | Method: {Method} | User: {User}",
                correlationId,
                context.Request.Path,
                context.Request.Method,
                RequestLoggingMiddleware.GetUserIdentity(context));
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.Items["CorrelationId"]?.ToString();
        if (!string.IsNullOrEmpty(correlationId))
            context.Response.Headers.Append("X-Correlation-ID", correlationId);

        // Ensure security headers are set on error responses
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        // In Development, include exception message to ease debugging (never do this in Production)
        object response = _environment.IsDevelopment()
            ? new
            {
                isSuccess = false,
                error = "An error occurred while processing your request.",
                detail = exception.Message,
                type = exception.GetType().Name
            }
            : Result.Failure("An error occurred while processing your request.");

        return context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}


