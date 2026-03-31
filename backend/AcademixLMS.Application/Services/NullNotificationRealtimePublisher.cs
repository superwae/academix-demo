using AcademixLMS.Application.Interfaces;

namespace AcademixLMS.Application.Services;

public sealed class NullNotificationRealtimePublisher : INotificationRealtimePublisher
{
    public Task PublishToUserAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
