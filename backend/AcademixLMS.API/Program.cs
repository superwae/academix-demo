using System.Globalization;
using AcademixLMS.API.Extensions;
using AcademixLMS.API.Localization;
using AcademixLMS.API.Middleware;
using Microsoft.AspNetCore.Localization;
using Serilog;
using AspNetCoreRateLimit;

var builder = WebApplication.CreateBuilder(args);

// Machine-local secrets (gitignored). Loaded after the standard appsettings files so it
// overrides them; environment variables still take precedence over everything.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();

// Cloud hosting (e.g. Render/Heroku) provides Postgres as a DATABASE_URL in URI form.
// Npgsql needs keyword form, so translate it into ConnectionStrings:DefaultConnection
// before any service (DbContext) reads the connection string.
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    var npgsql =
        $"Host={uri.Host};Port={(uri.Port > 0 ? uri.Port : 5432)};" +
        $"Database={uri.AbsolutePath.TrimStart('/')};" +
        $"Username={Uri.UnescapeDataString(userInfo[0])};" +
        $"Password={Uri.UnescapeDataString(userInfo.Length > 1 ? userInfo[1] : string.Empty)};" +
        "SSL Mode=Require;Trust Server Certificate=true";
    builder.Configuration["ConnectionStrings:DefaultConnection"] = npgsql;
}

// On Render the public URL is injected as RENDER_EXTERNAL_URL. Use it for email
// links and payment callbacks so they point at the live site instead of localhost.
var externalUrl = Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL");
if (!string.IsNullOrWhiteSpace(externalUrl))
{
    builder.Configuration["App:FrontendBaseUrl"] = externalUrl;
    builder.Configuration["Lahza:CallbackBaseUrl"] = externalUrl;
}

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

// Request localization: supported cultures + culture providers.
// Custom provider (user column) runs first, then Accept-Language, then default.
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    var supportedCultures = new[]
    {
        new CultureInfo("en"),
        new CultureInfo("ar"),
    };

    options.DefaultRequestCulture = new RequestCulture("en");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;

    options.RequestCultureProviders.Insert(0, new CustomRequestCultureProvider(
        UserPreferredLanguageCultureProvider.ResolveAsync));
});

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

// Serve the built React SPA (copied into wwwroot during the Docker build).
// Static assets are public and must be served before auth.
app.UseDefaultFiles();
app.UseStaticFiles();

// HTTPS Redirection - DISABLED in development to prevent CORS issues
// app.UseHttpsRedirection();

// Authentication & Authorization (in correct order)
app.UseAuthentication();
app.UseAuthorization();

// Request localization must run AFTER authentication so the custom culture
// provider can read the authenticated user's PreferredLanguage from the DB.
app.UseRequestLocalization();

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

// SPA fallback: any non-API, non-hub, non-health route returns index.html so
// client-side routing (e.g. /reset-password) works on a hard refresh.
app.MapFallbackToFile("index.html");

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
