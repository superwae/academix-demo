using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Data;

/// <summary>
/// Ensures core roles and optional local demo logins (Development only). Idempotent.
/// </summary>
public static class DevAccountsSeeder
{
    public const string DefaultPassword = "Academix123!";

    private static readonly (string Email, string FirstName, string LastName, string RoleName)[] Accounts =
    [
        ("student@academix.com", "Student", "Demo", "Student"),
        ("student01@academix.com", "Student01", "Demo", "Student"),
        ("student02@academix.com", "Student02", "Demo", "Student"),
        ("student03@academix.com", "Student03", "Demo", "Student"),
        ("teacher@academix.com", "Teacher", "Demo", "Instructor"),
        ("admin@academix.com", "Admin", "Demo", "Admin"),
        ("accountant@academix.com", "Accountant", "Demo", "Accountant"),
        ("secretary@academix.com", "Secretary", "Demo", "Secretary")
    ];

    public static async Task EnsureDefaultAccountsAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var roleNames = new[] { "Student", "Instructor", "Admin", "SuperAdmin", "Accountant", "Secretary" };
        foreach (var name in roleNames)
        {
            var exists = await context.Roles.AnyAsync(r => r.Name == name && !r.IsDeleted, cancellationToken);
            if (exists)
                continue;

            context.Roles.Add(new Role
            {
                Name = name,
                Description = name,
                IsSystemRole = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        await context.SaveChangesAsync(cancellationToken);

        var rolesByName = await context.Roles
            .AsNoTracking()
            .Where(r => !r.IsDeleted && roleNames.Contains(r.Name))
            .ToDictionaryAsync(r => r.Name, cancellationToken);

        foreach (var (email, firstName, lastName, roleName) in Accounts)
        {
            var normalized = email.Trim().ToLowerInvariant();
            if (await context.Users.AnyAsync(u => u.Email.ToLower() == normalized && !u.IsDeleted, cancellationToken))
                continue;

            if (!rolesByName.TryGetValue(roleName, out var role))
            {
                logger.LogWarning("DevAccountsSeeder: role {Role} missing; skipping {Email}.", roleName, email);
                continue;
            }

            var user = new User
            {
                Email = normalized,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword),
                FirstName = firstName,
                LastName = lastName,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(user);
            await context.SaveChangesAsync(cancellationToken);

            context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("DevAccountsSeeder: created {Email} with role {Role}.", normalized, roleName);
        }
    }
}
