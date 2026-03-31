using AcademixLMS.Application.DTOs.Messaging;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AcademixLMS.API.Hubs;

[Authorize]
public class MessagingHub : Hub
{
    private readonly IConversationService _conversationService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<MessagingHub> _logger;

    public MessagingHub(
        IConversationService conversationService,
        INotificationService notificationService,
        ILogger<MessagingHub> logger)
    {
        _conversationService = conversationService;
        _notificationService = notificationService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        _logger.LogInformation("User {UserId} connected to messaging hub", userId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        _logger.LogInformation("User {UserId} disconnected from messaging hub", userId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a conversation group to receive real-time updates
    /// </summary>
    public async Task JoinConversation(string conversationId)
    {
        var userId = GetUserId();
        
        // Verify user is a participant
        var conversationResult = await _conversationService.GetConversationByIdAsync(Guid.Parse(conversationId), userId);
        if (!conversationResult.IsSuccess)
        {
            await Clients.Caller.SendAsync("Error", "Not authorized to join this conversation");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
        _logger.LogInformation("User {UserId} joined conversation {ConversationId}", userId, conversationId);
    }

    /// <summary>
    /// Leave a conversation group
    /// </summary>
    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
        var userId = GetUserId();
        _logger.LogInformation("User {UserId} left conversation {ConversationId}", userId, conversationId);
    }

    /// <summary>
    /// Send a message (called from client, then broadcast to all participants)
    /// </summary>
    public async Task SendMessage(string conversationId, string content)
    {
        var userId = GetUserId();
        
        var request = new SendMessageRequest
        {
            ConversationId = Guid.Parse(conversationId),
            Content = content
        };

        var result = await _conversationService.SendMessageAsync(request, userId);
        
        if (!result.IsSuccess)
        {
            await Clients.Caller.SendAsync("Error", result.Error);
            return;
        }

        var messageDto = result.Value!;
        var conversationResult = await _conversationService.GetConversationByIdAsync(Guid.Parse(conversationId), userId);
        if (conversationResult.IsSuccess && conversationResult.Value != null)
        {
            var conv = conversationResult.Value;
            var otherParticipants = conv.Participants.Where(p => p.UserId != userId).ToList();

            var senderName = messageDto.SenderName;
            var contentPreview = messageDto.Content.Length > 80
                ? messageDto.Content[..80] + "..."
                : messageDto.Content;

            foreach (var participant in otherParticipants)
            {
                await _notificationService.CreateAsync(
                    participant.UserId,
                    "message",
                    $"New message from {senderName}",
                    contentPreview,
                    "/messages",
                    data: conversationId.ToString(),
                    cancellationToken: default);
            }

            await Clients.Group($"conversation_{conversationId}").SendAsync("MessageReceived", messageDto);

            foreach (var p in conv.Participants)
            {
                await Clients.Group($"user_{p.UserId}").SendAsync("ConversationUpdated", conv);
            }
        }
        else
        {
            await Clients.Group($"conversation_{conversationId}").SendAsync("MessageReceived", messageDto);
        }
    }

    /// <summary>
    /// Notify when a conversation request is sent
    /// </summary>
    public async Task NotifyConversationRequest(ConversationRequestDto request)
    {
        await Clients.Group($"user_{request.ReceiverId}").SendAsync("ConversationRequestReceived", request);
    }

    /// <summary>
    /// Notify when a conversation request is accepted
    /// </summary>
    public async Task NotifyConversationRequestAccepted(Guid requesterId, ConversationDto conversation)
    {
        await Clients.Group($"user_{requesterId}").SendAsync("ConversationRequestAccepted", conversation);
    }
}











