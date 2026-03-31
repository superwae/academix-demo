using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using AcademixLMS.Application.Extensions;
using AcademixLMS.Infrastructure.Extensions;
using AcademixLMS.API.Filters;
using AcademixLMS.API.Services;
using AcademixLMS.Application.Interfaces;

namespace AcademixLMS.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add Application layer
        services.AddApplication();

        // Real-time notifications (overrides Application null publisher)
        services.AddSingleton<INotificationRealtimePublisher, SignalRNotificationPublisher>();

        // Add Infrastructure layer
        services.AddInfrastructure(configuration);

        // Add SignalR — use camelCase for payloads so JS clients match REST API (e.g. senderIsStaff)
        services.AddSignalR().AddJsonProtocol(options =>
        {
            options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.PayloadSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        });

        // Add HttpContextAccessor for logging correlation across layers
        services.AddHttpContextAccessor();

        // Add Controllers with global action logging filter
        services.AddControllers(options =>
            {
                options.Filters.Add<ActionLoggingFilter>();
            })
            .ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors.Select(e => e.ErrorMessage))
                        .ToList();

                    return new BadRequestObjectResult(new
                    {
                        error = "Validation failed",
                        errors = errors
                    });
                };
            });

        // Add API Versioning
        services.AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new Microsoft.AspNetCore.Mvc.ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
        });

        services.AddVersionedApiExplorer(options =>
        {
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ClockSkew = TimeSpan.Zero
            };

            // SignalR JWT token handling
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        // Add Authorization policies
        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireAdmin", policy => policy.RequireRole("Admin", "SuperAdmin"));
            options.AddPolicy("RequireInstructor", policy => policy.RequireRole("Instructor", "Admin", "SuperAdmin"));
            options.AddPolicy("RequireStudent", policy => policy.RequireRole("Student", "Instructor", "Admin", "SuperAdmin"));
        });

        return services;
    }

    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "AcademixLMS API",
                Version = "v1",
                Description = "Learning Management System API",
                Contact = new OpenApiContact
                {
                    Name = "AcademixLMS",
                    Email = "support@academixlms.com"
                }
            });

            // Add JWT Authentication to Swagger
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer",
                BearerFormat = "JWT"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            // Group endpoints by controller name with ordered tags
            options.TagActionsBy(api =>
            {
                var controllerName = api.ActionDescriptor.RouteValues["controller"] ?? "Default";
                
                // Map controller names to ordered, descriptive tags
                var tagMap = new Dictionary<string, string>
                {
                    { "Auth", "1. Authentication" },
                    { "Users", "2. Users & Roles" },
                    { "Courses", "3. Courses" },
                    { "Enrollments", "4. Enrollments" },
                    { "Assignments", "5. Assignments" },
                    { "Exams", "6. Exams" },
                    { "Messages", "7. Messages" },
                    { "Conversations", "8. Messaging" }
                };
                
                return tagMap.TryGetValue(controllerName, out var tag) 
                    ? new[] { tag } 
                    : new[] { controllerName };
            });
            
            // Order actions within each tag group
            options.OrderActionsBy(apiDesc =>
            {
                var method = apiDesc.HttpMethod ?? "";
                var path = apiDesc.RelativePath ?? "";
                
                // Order: GET first, then POST, PUT, DELETE
                var methodOrder = method switch
                {
                    "GET" => "1",
                    "POST" => "2",
                    "PUT" => "3",
                    "PATCH" => "4",
                    "DELETE" => "5",
                    _ => "9"
                };
                
                return $"{methodOrder}_{path}";
            });
            
            options.DocInclusionPredicate((name, api) => true);
        });

        return services;
    }

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
            ?? new[] { "http://localhost:3000" };

        services.AddCors(options =>
            {
                options.AddPolicy("Development", policy =>
                {
                    // Allow both HTTP and HTTPS origins in development
                    var allOrigins = allowedOrigins.ToList();
                    // Also add HTTPS versions
                    foreach (var origin in allowedOrigins)
                    {
                        if (origin.StartsWith("http://"))
                        {
                            allOrigins.Add(origin.Replace("http://", "https://"));
                        }
                    }
                    policy.WithOrigins(allOrigins.ToArray())
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
                });

            options.AddPolicy("Production", policy =>
            {
                policy.WithOrigins(allowedOrigins)
                    .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                    .WithHeaders("Content-Type", "Authorization")
                    .AllowCredentials();
            });
        });

        return services;
    }
}

