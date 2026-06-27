using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Data;

/// <summary>
/// Ensures core roles and optional local development logins (Development only). Idempotent.
/// </summary>
public static class DevAccountsSeeder
{
    public const string DefaultPassword = "Academix123!";

    private static readonly (string Email, string FirstName, string LastName, string RoleName)[] Accounts =
    [
        ("student@academix.com", "Amina", "Hassan", "Student"),
        ("student01@academix.com", "Noor", "Khaled", "Student"),
        ("student02@academix.com", "Yara", "Mansour", "Student"),
        ("student03@academix.com", "Adam", "Saleh", "Student"),
        ("teacher@academix.com", "Leila", "Nasser", "Instructor"),
        ("admin@academix.com", "Maya", "Rahman", "Admin"),
        ("fulladmin@academix.com", "Jordan", "Al-Masri", "Admin"),
        ("accountant@academix.com", "Omar", "Farid", "Accountant"),
        ("secretary@academix.com", "Rana", "Khalil", "Secretary"),
        ("support@academix.com", "Sara", "Najjar", "Support")
    ];

    public static async Task EnsureDefaultAccountsAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var roleNames = new[] { "Student", "Instructor", "Admin", "SuperAdmin", "Accountant", "Secretary", "Support" };
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
            if (!rolesByName.TryGetValue(roleName, out var role))
            {
                logger.LogWarning("DevAccountsSeeder: role {Role} missing; skipping {Email}.", roleName, email);
                continue;
            }

            var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalized && !u.IsDeleted, cancellationToken);
            if (existingUser is not null)
            {
                if (existingUser.FirstName != firstName || existingUser.LastName != lastName)
                {
                    existingUser.FirstName = firstName;
                    existingUser.LastName = lastName;
                    existingUser.UpdatedAt = DateTime.UtcNow;
                }

                var hasRole = await context.UserRoles.AnyAsync(
                    ur => ur.UserId == existingUser.Id && ur.RoleId == role.Id && !ur.IsDeleted,
                    cancellationToken);
                if (!hasRole)
                {
                    context.UserRoles.Add(new UserRole
                    {
                        UserId = existingUser.Id,
                        RoleId = role.Id,
                        AssignedAt = DateTime.UtcNow
                    });
                    logger.LogInformation("DevAccountsSeeder: assigned role {Role} to existing {Email}.", roleName, normalized);
                }

                // Demo accounts get exactly one role — prevents support/admin overlap on re-seed
                var devRoleIds = rolesByName.Values.Select(r => r.Id).ToHashSet();
                var extraRoles = await context.UserRoles
                    .Where(ur => ur.UserId == existingUser.Id && !ur.IsDeleted && ur.RoleId != role.Id && devRoleIds.Contains(ur.RoleId))
                    .ToListAsync(cancellationToken);
                foreach (var extra in extraRoles)
                {
                    extra.IsDeleted = true;
                    extra.DeletedAt = DateTime.UtcNow;
                    logger.LogInformation(
                        "DevAccountsSeeder: removed extra role from {Email} (keeping {Role}).",
                        normalized,
                        roleName);
                }

                await context.SaveChangesAsync(cancellationToken);
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
