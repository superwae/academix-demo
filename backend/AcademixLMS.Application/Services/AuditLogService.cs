using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Audit;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(IApplicationDbContext context, ILogger<AuditLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RecordAsync(AuditLogCreateDto request, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.AuditLogs.Add(new AuditLog
            {
                Action = Truncate(request.Action, 120),
                Category = Truncate(request.Category, 60),
                ActorEmail = Truncate(request.ActorEmail, 256),
                ActorRole = Truncate(request.ActorRole, 120),
                ActorUserId = request.ActorUserId,
                Target = Truncate(request.Target, 256),
                Description = Truncate(request.Description, 1000),
                IpAddress = Truncate(request.IpAddress, 80),
                Method = Truncate(request.Method, 16),
                Path = Truncate(request.Path, 512),
                Status = Truncate(request.Status, 40),
                StatusCode = request.StatusCode,
                CorrelationId = TruncateNullable(request.CorrelationId, 80),
                DurationMs = request.DurationMs
            });

            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist audit log for {Action}.", request.Action);
        }
    }

    public async Task<Result<PagedResult<AuditLogDto>>> GetPagedAsync(PagedRequest request, AuditLogFilterRequest? filters = null, CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(filters?.Category) && filters.Category != "all")
        {
            query = query.Where(x => x.Category == filters.Category);
        }

        if (!string.IsNullOrWhiteSpace(filters?.Status) && filters.Status != "all")
        {
            query = query.Where(x => x.Status == filters.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.ToLower();
            query = query.Where(x =>
                x.Action.ToLower().Contains(search) ||
                x.ActorEmail.ToLower().Contains(search) ||
                x.Target.ToLower().Contains(search) ||
                x.Description.ToLower().Contains(search) ||
                x.IpAddress.ToLower().Contains(search));
        }

        query = request.SortBy?.ToLowerInvariant() switch
        {
            "actor" => request.SortDescending
                ? query.OrderByDescending(x => x.ActorEmail)
                : query.OrderBy(x => x.ActorEmail),
            "action" => request.SortDescending
                ? query.OrderByDescending(x => x.Action)
                : query.OrderBy(x => x.Action),
            "status" => request.SortDescending
                ? query.OrderByDescending(x => x.Status)
                : query.OrderBy(x => x.Status),
            _ => request.SortDescending
                ? query.OrderBy(x => x.CreatedAt)
                : query.OrderByDescending(x => x.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(x => new AuditLogDto
            {
                Id = x.Id,
                Action = x.Action,
                Category = x.Category,
                Actor = x.ActorEmail,
                ActorRole = x.ActorRole,
                Target = x.Target,
                Description = x.Description,
                IpAddress = x.IpAddress,
                Status = x.Status,
                Method = x.Method,
                Path = x.Path,
                Timestamp = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Result<PagedResult<AuditLogDto>>.Success(new PagedResult<AuditLogDto>
        {
            Items = items,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<AuditLogSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var logs = _context.AuditLogs.AsQueryable();

        return Result<AuditLogSummaryDto>.Success(new AuditLogSummaryDto
        {
            TotalEvents = await logs.CountAsync(cancellationToken),
            TodayEvents = await logs.CountAsync(x => x.CreatedAt >= today, cancellationToken),
            FailedActions = await logs.CountAsync(x => x.Status == "error", cancellationToken)
        });
    }

    private static string Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static string? TruncateNullable(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
