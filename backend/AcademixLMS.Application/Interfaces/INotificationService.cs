using AcademixLMS.Application.Common;

namespace AcademixLMS.Application.Interfaces;

public interface INotificationService
{
    Task<Result<PagedResult<NotificationDto>>> GetForUserAsync(Guid userId, PagedRequest request, bool? unreadOnly, CancellationToken cancellationToken = default);
    Task<Result<int>> GetUnreadCountAsync(Guid userId, string? type = null, CancellationToken cancellationToken = default);
    Task<Result> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<int>> MarkAsReadByTypeAsync(Guid userId, string type, CancellationToken cancellationToken = default);
    Task<Result> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<NotificationDto>> CreateAsync(Guid userId, string type, string title, string message, string? link = null, string? data = null, DateTime? expiresAt = null, CancellationToken cancellationToken = default);
}

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
