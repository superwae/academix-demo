namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Pushes notification payloads to connected clients (e.g. SignalR). Implemented in the API host.
/// </summary>
public interface INotificationRealtimePublisher
{
    Task PublishToUserAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default);
}
