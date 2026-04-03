using AcademixLMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.API.Extensions;

internal static class DuplicateExamCleanup
{
    /// <summary>
    /// For each (CourseId, Title, StartsAt) group with multiple exams, keep one and soft-delete the rest.
    /// Reassigns all attempts from duplicates to the kept exam so no data is lost.
    /// </summary>
    public static async Task RunAsync(ApplicationDbContext context, ILogger logger, CancellationToken cancellationToken = default)
    {
        var exams = await context.Exams
            .Where(e => !e.IsDeleted)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        var groups = exams
            .GroupBy(e => new { e.CourseId, e.Title, e.StartsAt })
            .Where(g => g.Count() > 1)
            .ToList();

        if (groups.Count == 0)
            return;

        int totalRemoved = 0;
        foreach (var group in groups)
        {
            var list = group.ToList();
            var keep = list[0];
            foreach (var duplicate in list.Skip(1))
            {
                var attemptsToMove = await context.ExamAttempts
                    .Where(a => a.ExamId == duplicate.Id && !a.IsDeleted)
                    .ToListAsync(cancellationToken);
                foreach (var a in attemptsToMove)
                {
                    a.ExamId = keep.Id;
                    a.UpdatedAt = DateTime.UtcNow;
                }

                var questionsToDelete = await context.ExamQuestions
                    .Where(q => q.ExamId == duplicate.Id && !q.IsDeleted)
                    .ToListAsync(cancellationToken);
                foreach (var q in questionsToDelete)
                {
                    q.IsDeleted = true;
                    q.DeletedAt = DateTime.UtcNow;
                }

                duplicate.IsDeleted = true;
                duplicate.DeletedAt = DateTime.UtcNow;
                totalRemoved++;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Duplicate exam cleanup: merged {Count} duplicate exam groups, soft-deleted {Removed} duplicate exam(s).", groups.Count, totalRemoved);
    }
}

public static class DatabaseExtensions
{
    /// <summary>
    /// Ensures database is created and migrations are applied.
    /// </summary>
    public static async Task<WebApplication> MigrateDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<Program>>();
        var configuration = services.GetRequiredService<IConfiguration>();

        try
        {
            var context = services.GetRequiredService<ApplicationDbContext>();

            // Apply pending migrations
            logger.LogInformation("Applying database migrations...");
            await context.Database.MigrateAsync();

            // Ensure ScorePublishedAt exists (in case migration was marked applied but column was missing)
            await context.Database.ExecuteSqlRawAsync(
                @"ALTER TABLE ""ExamAttempts"" ADD COLUMN IF NOT EXISTS ""ScorePublishedAt"" timestamp with time zone NULL;");
            await context.Database.ExecuteSqlRawAsync(
                @"ALTER TABLE ""ExamAttempts"" ADD COLUMN IF NOT EXISTS ""ShortAnswerTextJson"" character varying(5000) NULL;");
            // Match AddAssignmentSubmissionInstructorScore migration — fixes DBs where history is out of sync
            await context.Database.ExecuteSqlRawAsync(
                @"ALTER TABLE ""AssignmentSubmissions"" ADD COLUMN IF NOT EXISTS ""InstructorScore"" numeric(10,2) NULL;");

            // AddCourseCertificateSettings — fixes DBs where migration history is applied but columns are missing
            await context.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "IssueCertificates" boolean NOT NULL DEFAULT false;
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "CertificateSummary" character varying(2000) NULL;
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "CertificateDisplayHours" numeric(8,2) NULL;
                """);

            // Create Notifications table if not exists
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS ""Notifications"" (
                    ""Id"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""Type"" character varying(50) NOT NULL,
                    ""Title"" character varying(200) NOT NULL,
                    ""Message"" character varying(1000) NOT NULL,
                    ""Link"" character varying(500) NULL,
                    ""IsRead"" boolean NOT NULL DEFAULT false,
                    ""Data"" character varying(2000) NULL,
                    ""ExpiresAt"" timestamp with time zone NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone NULL,
                    ""CreatedBy"" uuid NULL,
                    ""UpdatedBy"" uuid NULL,
                    ""IsDeleted"" boolean NOT NULL DEFAULT false,
                    ""DeletedAt"" timestamp with time zone NULL,
                    ""DeletedBy"" uuid NULL,
                    CONSTRAINT ""PK_Notifications"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_Notifications_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS ""IX_Notifications_UserId_IsRead"" ON ""Notifications"" (""UserId"", ""IsRead"");
                CREATE INDEX IF NOT EXISTS ""IX_Notifications_CreatedAt"" ON ""Notifications"" (""CreatedAt"");
            ");

            // Remove duplicate exams (same course, title, start time); keep one per slot, reassign attempts
            await DuplicateExamCleanup.RunAsync(context, logger, cancellationToken: default);

            var deleteAllUsers = configuration.GetValue<bool>("Database:DeleteAllUsersOnStartup", false);
            if (deleteAllUsers && app.Environment.IsDevelopment())
            {
                logger.LogWarning("Database:DeleteAllUsersOnStartup is enabled — truncating Users (CASCADE removes dependent rows).");
                await context.Database.ExecuteSqlRawAsync(@"TRUNCATE TABLE ""Users"" RESTART IDENTITY CASCADE;");
                logger.LogWarning("Users table truncated.");
            }

            if (app.Environment.IsDevelopment())
            {
                await DevAccountsSeeder.EnsureDefaultAccountsAsync(context, logger, cancellationToken: default);
                await DemoFacultyBulkSeeder.EnsureAsync(context, logger, cancellationToken: default);
                await DemoFacultyBulkSeeder.BackfillDemoCourseThumbnailsAsync(context, logger, cancellationToken: default);
                await SubscriptionPlanSeeder.EnsureAsync(context, logger, cancellationToken: default);
            }

            logger.LogInformation("Database migration completed.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while migrating or seeding the database.");
            throw;
        }

        return app;
    }
}


