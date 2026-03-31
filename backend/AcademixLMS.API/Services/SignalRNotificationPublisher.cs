using AcademixLMS.API.Hubs;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AcademixLMS.API.Services;

public sealed class SignalRNotificationPublisher : INotificationRealtimePublisher
{
    private readonly IHubContext<MessagingHub> _hubContext;

    public SignalRNotificationPublisher(IHubContext<MessagingHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PublishToUserAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.Group($"user_{userId}").SendAsync("NotificationReceived", notification, cancellationToken);
    }
}
