using AcademixLMS.Application.Common;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.Application.Services;

public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationRealtimePublisher _realtime;

    public NotificationService(IApplicationDbContext context, INotificationRealtimePublisher realtime)
    {
        _context = context;
        _realtime = realtime;
    }

    public async Task<Result<PagedResult<NotificationDto>>> GetForUserAsync(Guid userId, PagedRequest request, bool? unreadOnly, CancellationToken cancellationToken = default)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == userId && !n.IsDeleted);

        if (unreadOnly == true)
            query = query.Where(n => !n.IsRead);

        query = query.OrderByDescending(n => n.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var skip = (request.PageNumber - 1) * request.PageSize;
        var items = await query
            .Skip(skip)
            .Take(request.PageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                Link = n.Link,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                ExpiresAt = n.ExpiresAt
            })
            .ToListAsync(cancellationToken);

        return Result<PagedResult<NotificationDto>>.Success(new PagedResult<NotificationDto>
        {
            Items = items,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<int>> GetUnreadCountAsync(Guid userId, string? type = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId && !n.IsRead && !n.IsDeleted);
        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(n => n.Type == type);
        var count = await query.CountAsync(cancellationToken);
        return Result<int>.Success(count);
    }

    public async Task<Result> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var n = await _context.Notifications
            .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, cancellationToken);
        if (n == null)
            return Result.Failure("Notification not found.");
        n.IsRead = true;
        n.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<int>> MarkAsReadByTypeAsync(Guid userId, string type, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(type))
            return Result<int>.Failure("Type is required.");

        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead && !n.IsDeleted && n.Type == type)
            .ToListAsync(cancellationToken);

        foreach (var n in notifications)
        {
            n.IsRead = true;
            n.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<int>.Success(notifications.Count);
    }

    public async Task<Result> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);
        foreach (var n in notifications)
        {
            n.IsRead = true;
            n.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<NotificationDto>> CreateAsync(Guid userId, string type, string title, string message, string? link = null, string? data = null, DateTime? expiresAt = null, CancellationToken cancellationToken = default)
    {
        var n = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            Link = link,
            Data = data,
            ExpiresAt = expiresAt,
            IsRead = false
        };
        _context.Notifications.Add(n);
        await _context.SaveChangesAsync(cancellationToken);
        var dto = new NotificationDto
        {
            Id = n.Id,
            Type = n.Type,
            Title = n.Title,
            Message = n.Message,
            Link = n.Link,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
            ExpiresAt = n.ExpiresAt
        };
        await _realtime.PublishToUserAsync(userId, dto, cancellationToken);
        return Result<NotificationDto>.Success(dto);
    }
}
