using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Data;

/// <summary>
/// Logs all database SaveChanges operations with entity change counts.
/// </summary>
public class SaveChangesLoggingInterceptor : SaveChangesInterceptor
{
    private readonly ILogger<SaveChangesLoggingInterceptor> _logger;

    public SaveChangesLoggingInterceptor(ILogger<SaveChangesLoggingInterceptor> logger)
    {
        _logger = logger;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        LogChanges(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        LogChanges(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        _logger.LogInformation(
            "[DB SAVED] Context: {Context} | Rows affected: {Rows} | Success: {Success}",
            eventData.Context?.GetType().Name ?? "Unknown",
            result,
            !eventData.Context?.Database.CurrentTransaction?.SupportsSavepoints ?? true);
        return base.SavedChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "[DB SAVED] Context: {Context} | Rows affected: {Rows}",
            eventData.Context?.GetType().Name ?? "Unknown",
            result);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private void LogChanges(DbContext? context)
    {
        if (context == null) return;

        var entries = context.ChangeTracker.Entries();
        var added = entries.Count(e => e.State == EntityState.Added);
        var modified = entries.Count(e => e.State == EntityState.Modified);
        var deleted = entries.Count(e => e.State == EntityState.Deleted);

        if (added + modified + deleted == 0) return;

        var entitySummary = entries
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .GroupBy(e => e.Entity.GetType().Name)
            .Select(g => $"{g.Key}: +{g.Count(x => x.State == EntityState.Added)} ~{g.Count(x => x.State == EntityState.Modified)} -{g.Count(x => x.State == EntityState.Deleted)}")
            .ToList();

        _logger.LogInformation(
            "[DB SAVING] Context: {Context} | Added: {Added} | Modified: {Modified} | Deleted: {Deleted} | Entities: {Entities}",
            context.GetType().Name,
            added,
            modified,
            deleted,
            string.Join("; ", entitySummary));
    }
}
