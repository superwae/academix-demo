using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Data;

public static class LocalDataSanitizer
{
    public static async Task RemoveVisibleQaArtifactsAsync(
        ApplicationDbContext context,
        ILogger logger,
        IConfiguration? configuration = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var users = await context.Users
            .Where(u =>
                !u.IsDeleted &&
                (u.Email.StartsWith("qa.") ||
                 (u.Email.StartsWith("qa") && u.Email.EndsWith("@test.com")) ||
                 u.FirstName == "QA"))
            .ToListAsync(cancellationToken);

        var courses = await context.Courses
            .Where(c =>
                !c.IsDeleted &&
                (c.Title.StartsWith("QA ") ||
                 c.ProviderName.StartsWith("QA ") ||
                 c.Title.ToLower() == "test" ||
                 c.Title.ToLower().StartsWith("test ") ||
                 c.Title.ToLower().StartsWith("test-") ||
                 c.Title.ToLower().StartsWith("test_") ||
                 c.Title.ToLower().StartsWith("test.") ||
                 c.Title.ToLower().StartsWith("test2")))
            .ToListAsync(cancellationToken);

        var organizations = await context.Organizations
            .Where(o =>
                !o.IsDeleted &&
                (o.Name.StartsWith("QA ") || o.Slug.StartsWith("qa-")))
            .ToListAsync(cancellationToken);

        var subscriptionPlans = await context.SubscriptionPlans
            .Where(p =>
                !p.IsDeleted &&
                (p.Name == "gg" ||
                 p.Name.StartsWith("QA ") ||
                 p.Name.ToLower() == "test" ||
                 p.Name.ToLower().StartsWith("test ") ||
                 p.Name.ToLower().StartsWith("test-") ||
                 p.Name.ToLower().StartsWith("test_") ||
                 p.Name.ToLower().StartsWith("demo")))
            .ToListAsync(cancellationToken);

        var userIds = users.Select(u => u.Id).ToHashSet();
        var courseIds = courses.Select(c => c.Id).ToHashSet();
        var organizationIds = organizations.Select(o => o.Id).ToHashSet();
        var subscriptionPlanIds = subscriptionPlans.Select(p => p.Id).ToHashSet();

        var courseSections = await context.CourseSections
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .ToListAsync(cancellationToken);
        var sectionIds = courseSections.Select(s => s.Id).ToHashSet();

        var courseLicenses = await context.CourseLicenses
            .Where(x => !x.IsDeleted && (courseIds.Contains(x.CourseId) || organizationIds.Contains(x.OrganizationId)))
            .ToListAsync(cancellationToken);
        var licenseIds = courseLicenses.Select(x => x.Id).ToHashSet();

        var enrollments = await context.Enrollments
            .Where(x =>
                !x.IsDeleted &&
                (courseIds.Contains(x.CourseId) ||
                 userIds.Contains(x.UserId) ||
                 (x.AssignedByOrgId.HasValue && organizationIds.Contains(x.AssignedByOrgId.Value))))
            .ToListAsync(cancellationToken);

        var payments = await context.Payments
            .Where(x =>
                !x.IsDeleted &&
                (userIds.Contains(x.UserId) ||
                 (x.CourseId.HasValue && courseIds.Contains(x.CourseId.Value)) ||
                 (x.OrganizationId.HasValue && organizationIds.Contains(x.OrganizationId.Value)) ||
                 (x.CourseLicenseId.HasValue && licenseIds.Contains(x.CourseLicenseId.Value))))
            .ToListAsync(cancellationToken);

        var organizationMembers = await context.OrganizationMembers
            .Where(x => !x.IsDeleted && (organizationIds.Contains(x.OrganizationId) || userIds.Contains(x.UserId)))
            .ToListAsync(cancellationToken);

        var subscriptions = await context.Subscriptions
            .Where(x =>
                !x.IsDeleted &&
                (userIds.Contains(x.UserId) || subscriptionPlanIds.Contains(x.PlanId)))
            .ToListAsync(cancellationToken);
        var subscriptionIds = subscriptions.Select(x => x.Id).ToHashSet();

        var assignments = await context.Assignments
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .ToListAsync(cancellationToken);
        var exams = await context.Exams
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .ToListAsync(cancellationToken);
        var lessons = await context.Lessons
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .ToListAsync(cancellationToken);
        var materials = await context.CourseMaterials
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .ToListAsync(cancellationToken);
        var discounts = await context.Discounts
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .ToListAsync(cancellationToken);

        var subscriptionPayments = await context.Payments
            .Where(x =>
                !x.IsDeleted &&
                x.SubscriptionId.HasValue &&
                subscriptionIds.Contains(x.SubscriptionId.Value))
            .ToListAsync(cancellationToken);

        var localInstantPayments = await context.Payments
            .Where(x =>
                !x.IsDeleted &&
                ((x.LahzaReference != null && x.LahzaReference.StartsWith("demo_")) ||
                 x.LahzaChannel == "demo"))
            .ToListAsync(cancellationToken);

        var externalThumbnailCourses = await context.Courses
            .Where(c =>
                !c.IsDeleted &&
                c.ThumbnailUrl != null &&
                (c.ThumbnailUrl.StartsWith("https://images.unsplash.com/") ||
                 c.ThumbnailUrl.StartsWith("http://images.unsplash.com/")))
            .ToListAsync(cancellationToken);

        var fileBackedProfileUsers = await context.Users
            .Where(u =>
                !u.IsDeleted &&
                u.ProfilePictureUrl != null &&
                u.ProfilePictureUrl.StartsWith("/api/v1/files/profile-photos/"))
            .ToListAsync(cancellationToken);

        var removed = 0;
        removed += SoftDelete(users, now);
        removed += SoftDelete(courses, now);
        removed += SoftDelete(organizations, now);
        removed += SoftDelete(courseSections, now);
        removed += SoftDelete(courseLicenses, now);
        removed += SoftDelete(enrollments, now);
        removed += SoftDelete(payments, now);
        removed += SoftDelete(organizationMembers, now);
        removed += SoftDelete(subscriptionPlans, now);
        removed += SoftDelete(subscriptions, now);
        removed += SoftDelete(assignments, now);
        removed += SoftDelete(exams, now);
        removed += SoftDelete(lessons, now);
        removed += SoftDelete(materials, now);
        removed += SoftDelete(discounts, now);
        removed += SoftDelete(subscriptionPayments, now);

        var normalized = NormalizeLocalPaymentReferences(localInstantPayments, now);
        var normalizedAssets = NormalizeBrokenAssetReferences(
            externalThumbnailCourses,
            fileBackedProfileUsers,
            configuration,
            now);

        if (removed > 0 || normalized > 0 || normalizedAssets > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation(
                "LocalDataSanitizer: soft-deleted {RemovedCount} visible QA artifact row(s), normalized {NormalizedCount} local payment reference(s), cleared {AssetCount} broken asset reference(s).",
                removed,
                normalized,
                normalizedAssets);
        }
    }

    private static int SoftDelete<T>(IEnumerable<T> rows, DateTime now)
        where T : BaseEntity
    {
        var count = 0;
        foreach (var row in rows)
        {
            row.IsDeleted = true;
            row.DeletedAt = now;
            row.UpdatedAt = now;
            count++;
        }

        return count;
    }

    private static int NormalizeLocalPaymentReferences(IEnumerable<Payment> rows, DateTime now)
    {
        var count = 0;
        foreach (var row in rows)
        {
            if (row.LahzaReference?.StartsWith("demo_") == true)
            {
                row.LahzaReference = "local_" + row.LahzaReference["demo_".Length..];
            }

            if (row.LahzaChannel == "demo")
            {
                row.LahzaChannel = "local";
            }

            row.UpdatedAt = now;
            count++;
        }

        return count;
    }

    private static int NormalizeBrokenAssetReferences(
        IEnumerable<Course> externalThumbnailCourses,
        IEnumerable<User> fileBackedProfileUsers,
        IConfiguration? configuration,
        DateTime now)
    {
        var count = 0;

        foreach (var course in externalThumbnailCourses)
        {
            course.ThumbnailUrl = null;
            course.UpdatedAt = now;
            count++;
        }

        foreach (var user in fileBackedProfileUsers)
        {
            if (UploadedFileExists(user.ProfilePictureUrl, configuration))
            {
                continue;
            }

            user.ProfilePictureUrl = null;
            user.UpdatedAt = now;
            count++;
        }

        return count;
    }

    private static bool UploadedFileExists(string? fileUrl, IConfiguration? configuration)
    {
        const string prefix = "/api/v1/files/";
        if (configuration == null || string.IsNullOrWhiteSpace(fileUrl) ||
            !fileUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var relativePath = fileUrl[prefix.Length..]
            .Split(new[] { '?', '#' }, StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return false;
        }

        var uploadsPath = configuration["Storage:UploadsPath"] ?? "uploads";
        var contentRoot = configuration["ContentRoot"] ?? AppContext.BaseDirectory ?? Directory.GetCurrentDirectory();
        var uploadsRoot = Path.GetFullPath(Path.Combine(contentRoot, uploadsPath));
        var fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var rootWithSeparator = uploadsRoot.EndsWith(Path.DirectorySeparatorChar)
            ? uploadsRoot
            : $"{uploadsRoot}{Path.DirectorySeparatorChar}";

        if (!fullPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(fullPath, uploadsRoot, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return File.Exists(fullPath);
    }
}
