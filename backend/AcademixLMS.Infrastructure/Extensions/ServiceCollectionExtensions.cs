using AcademixLMS.Application.Interfaces;
using AcademixLMS.Infrastructure.Data;
using AcademixLMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AcademixLMS.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Register SaveChanges logging interceptor
        services.AddScoped<SaveChangesLoggingInterceptor>();

        // Add DbContext and register as IApplicationDbContext
        services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
        {
            var interceptor = serviceProvider.GetRequiredService<SaveChangesLoggingInterceptor>();
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
                .AddInterceptors(interceptor);
        });

        // Register DbContext as interface for Clean Architecture
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        // Register Infrastructure services
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IEmailService, MailjetEmailService>();
        services.AddScoped<IStorageService, LocalStorageService>();

        return services;
    }
}

