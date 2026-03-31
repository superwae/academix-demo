using AcademixLMS.API.Extensions;
using AcademixLMS.API.Middleware;
using Serilog;
using AspNetCoreRateLimit;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .CreateLogger();

// Use Serilog for logging
builder.Host.UseSerilog();

// Add HttpClient for Mailjet and other HTTP calls
builder.Services.AddHttpClient();

// Add API services (Application, Infrastructure, Controllers, Versioning)
builder.Services.AddApiServices(builder.Configuration);

// Add JWT Authentication
builder.Services.AddJwtAuthentication(builder.Configuration);

// Add Swagger/OpenAPI
builder.Services.AddSwaggerConfiguration();

// Add CORS
builder.Services.AddCorsConfiguration(builder.Configuration);

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

// Add Rate Limiting
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

var app = builder.Build();

// Configure Kestrel to listen on both HTTP and HTTPS in Development
if (app.Environment.IsDevelopment())
{
    app.Urls.Add("http://localhost:5261");
    app.Urls.Add("https://localhost:7261");
}

// Configure the HTTP request pipeline

// CORS (MUST be FIRST - handles preflight OPTIONS requests before anything else)
var corsPolicy = app.Environment.IsDevelopment() ? "Development" : "Production";
app.UseCors(corsPolicy);

// Request logging - early to add CorrelationId; runs after auth so we capture user identity
app.UseMiddleware<RequestLoggingMiddleware>();

// Security Headers (must be first after exception handler)
app.UseMiddleware<SecurityHeadersMiddleware>();

// Global Exception Handler (must be early in pipeline)
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Rate Limiting (before other middleware)
app.UseIpRateLimiting();

// HTTPS Redirection - DISABLED in development to prevent CORS issues
// app.UseHttpsRedirection();

// Authentication & Authorization (in correct order)
app.UseAuthentication();
app.UseAuthorization();

// Swagger (Development only)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AcademixLMS API v1");
        options.RoutePrefix = string.Empty; // Swagger at root
    });
}

// Health Check endpoint
app.MapHealthChecks("/health");

// SignalR Hub - Enabled for real-time messaging
app.MapHub<AcademixLMS.API.Hubs.MessagingHub>("/hubs/messaging");

// Controllers
app.MapControllers();

// Migrate database and seed initial data
await app.MigrateDatabaseAsync();

try
{
    Log.Information("Starting AcademixLMS API");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
