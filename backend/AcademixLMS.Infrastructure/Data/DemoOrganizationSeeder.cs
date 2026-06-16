using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Data;

/// <summary>
/// Seeds two demo organizations so you can log in and see both archetypes immediately.
/// Idempotent — safe to run on every boot.
/// </summary>
public static class DemoOrganizationSeeder
{
    private const string DefaultPassword = "Academix123!";

    private static readonly (string Email, string FirstName, string LastName, string RoleName, OrgSeed Org, OrgMemberRole OrgRole)[] SeededUsers =
    [
        ("orgadmin@acme.com",           "Acme",  "HR Lead",    "Student", OrgSeed.Acme,   OrgMemberRole.OrgAdmin),
        ("orgadmin@amman-academy.com",  "Amman", "Dean",       "Instructor", OrgSeed.AmmanAcademy, OrgMemberRole.OrgAdmin),
    ];

    private enum OrgSeed
    {
        Acme,
        AmmanAcademy
    }

    public static async Task EnsureAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var studentRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Student" && !r.IsDeleted, cancellationToken);
        var instructorRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Instructor" && !r.IsDeleted, cancellationToken);
        if (studentRole is null || instructorRole is null)
        {
            logger.LogWarning("DemoOrganizationSeeder: required roles missing; skipping.");
            return;
        }

        // Create the two platform users who will own the seeded orgs (if not already present)
        foreach (var (email, first, last, roleName, _, _) in SeededUsers)
        {
            var normalized = email.Trim().ToLowerInvariant();
            var exists = await context.Users.AnyAsync(u => u.Email.ToLower() == normalized && !u.IsDeleted, cancellationToken);
            if (exists) continue;

            var roleId = roleName == "Instructor" ? instructorRole.Id : studentRole.Id;
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = normalized,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword),
                FirstName = first,
                LastName = last,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            context.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = user.Id, RoleId = roleId });
            logger.LogInformation("DemoOrganizationSeeder: created user {Email}.", normalized);
        }
        await context.SaveChangesAsync(cancellationToken);

        // Look up the freshly created owners
        var acmeOwner = await context.Users.FirstAsync(u => u.Email == "orgadmin@acme.com", cancellationToken);
        var ammanOwner = await context.Users.FirstAsync(u => u.Email == "orgadmin@amman-academy.com", cancellationToken);

        // Acme Corp (Employer)
        var acme = await EnsureOrgAsync(
            context,
            slug: "acme-corp",
            name: "Acme Corp",
            type: OrganizationType.Employer,
            ownerId: acmeOwner.Id,
            description: "A hospital group using AcademiX for mandatory staff training.",
            contactEmail: "orgadmin@acme.com",
            cancellationToken);

        // Amman Coding Academy (Teaching Institution)
        var amman = await EnsureOrgAsync(
            context,
            slug: "amman-coding-academy",
            name: "Amman Coding Academy",
            type: OrganizationType.TeachingInstitution,
            ownerId: ammanOwner.Id,
            description: "A 12-instructor bootcamp running cohort-based coding programs out of Amman.",
            contactEmail: "orgadmin@amman-academy.com",
            cancellationToken);

        // Make each owner an OrgAdmin member
        await EnsureMemberAsync(context, acme.Id, acmeOwner.Id, OrgMemberRole.OrgAdmin, cancellationToken);
        await EnsureMemberAsync(context, amman.Id, ammanOwner.Id, OrgMemberRole.OrgAdmin, cancellationToken);

        await EnsureOrganizationSubscriptionAsync(context, acme, acmeOwner.Id, "Enterprise", cancellationToken);
        await EnsureOrganizationSubscriptionAsync(context, amman, ammanOwner.Id, "Enterprise", cancellationToken);

        // Promote the demo student01..03 accounts to Acme employees so the member list has content
        foreach (var email in new[] { "student01@academix.com", "student02@academix.com", "student03@academix.com" })
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);
            if (user is null) continue;
            await EnsureMemberAsync(context, acme.Id, user.Id, OrgMemberRole.OrgEmployee, cancellationToken);
        }

        // Make the demo teacher an OrgTeacher at Amman so the teacher portal shows they're under an org
        var demoTeacher = await context.Users.FirstOrDefaultAsync(u => u.Email == "teacher@academix.com" && !u.IsDeleted, cancellationToken);
        if (demoTeacher is not null)
        {
            await EnsureMemberAsync(context, amman.Id, demoTeacher.Id, OrgMemberRole.OrgTeacher, cancellationToken);
        }

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("DemoOrganizationSeeder: complete. Acme={Acme} Amman={Amman}.", acme.Slug, amman.Slug);
    }

    private static async Task<Organization> EnsureOrgAsync(
        ApplicationDbContext context,
        string slug,
        string name,
        OrganizationType type,
        Guid ownerId,
        string description,
        string contactEmail,
        CancellationToken cancellationToken)
    {
        var existing = await context.Organizations.FirstOrDefaultAsync(o => o.Slug == slug && !o.IsDeleted, cancellationToken);
        if (existing is not null) return existing;

        var org = new Organization
        {
            Id = Guid.NewGuid(),
            Name = name,
            Slug = slug,
            Description = description,
            ContactEmail = contactEmail,
            Type = type,
            OwnerUserId = ownerId,
            IsActive = true,
            PlatformFeePercent = type == OrganizationType.TeachingInstitution ? 15m : 0m,
            OrgFeePercent = type == OrganizationType.TeachingInstitution ? 30m : 0m
        };
        context.Organizations.Add(org);
        await context.SaveChangesAsync(cancellationToken);
        return org;
    }

    private static async Task EnsureMemberAsync(
        ApplicationDbContext context,
        Guid orgId,
        Guid userId,
        OrgMemberRole role,
        CancellationToken cancellationToken)
    {
        var existing = await context.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId && m.IsActive && !m.IsDeleted, cancellationToken);
        if (existing is not null)
        {
            existing.Role = role;
            existing.InviteAcceptedAt ??= DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;
            return;
        }

        context.OrganizationMembers.Add(new OrganizationMember
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgId,
            UserId = userId,
            Role = role,
            JoinedAt = DateTime.UtcNow,
            IsActive = true,
            InviteAcceptedAt = DateTime.UtcNow
        });
    }

    private static async Task EnsureOrganizationSubscriptionAsync(
        ApplicationDbContext context,
        Organization org,
        Guid ownerUserId,
        string planName,
        CancellationToken cancellationToken)
    {
        if (org.SubscriptionId is { } existingId)
        {
            var activeExisting = await context.Subscriptions.AnyAsync(
                s => s.Id == existingId && s.Status == SubscriptionStatus.Active && !s.IsDeleted,
                cancellationToken);
            if (activeExisting) return;
        }

        var plan = await context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Name == planName && p.IsActive && !p.IsDeleted, cancellationToken);
        if (plan is null) return;

        var now = DateTime.UtcNow;
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = ownerUserId,
            PlanId = plan.Id,
            BillingInterval = BillingInterval.Yearly,
            Status = SubscriptionStatus.Active,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = now.AddYears(1),
            CreatedAt = now,
            CreatedBy = ownerUserId
        };

        context.Subscriptions.Add(subscription);
        org.SubscriptionId = subscription.Id;
        org.UpdatedAt = now;
        await context.SaveChangesAsync(cancellationToken);
    }
}
