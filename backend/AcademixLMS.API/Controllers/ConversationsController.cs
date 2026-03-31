using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Messaging;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.API.Extensions;
using AcademixLMS.API.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("4. Messaging")]
public class ConversationsController : ControllerBase
{
    private readonly IConversationService _conversationService;
    private readonly INotificationService _notificationService;
    private readonly IHubContext<MessagingHub> _hubContext;
    private readonly ILogger<ConversationsController> _logger;

    public ConversationsController(
        IConversationService conversationService,
        INotificationService notificationService,
        IHubContext<MessagingHub> hubContext,
        ILogger<ConversationsController> logger)
    {
        _conversationService = conversationService;
        _notificationService = notificationService;
        _hubContext = hubContext;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get all conversations for the current user
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ConversationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();
        var result = await _conversationService.GetUserConversationsAsync(userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get conversation by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversation(Guid id)
    {
        var userId = GetUserId();
        var result = await _conversationService.GetConversationByIdAsync(id, userId);

        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a new conversation
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
    {
        var userId = GetUserId();
        var result = await _conversationService.CreateConversationAsync(request, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetConversation), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Get messages for a conversation
    /// </summary>
    [HttpGet("{conversationId}/messages")]
    [ProducesResponseType(typeof(List<ConversationMessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();
        var result = await _conversationService.GetConversationMessagesAsync(conversationId, userId, pageNumber, pageSize);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Send a message in a conversation
    /// </summary>
    [HttpPost("{conversationId}/messages")]
    [ProducesResponseType(typeof(ConversationMessageDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> SendMessage(Guid conversationId, [FromBody] SendMessageRequest request, CancellationToken cancellationToken = default)
    {
        if (request.ConversationId != conversationId)
            return BadRequest("Conversation ID mismatch.");

        var userId = GetUserId();
        var result = await _conversationService.SendMessageAsync(request, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        var messageDto = result.Value!;

        // Must run in the same request scope — Task.Run after return disposes DbContext and notifications never save.
        try
        {
            var conversationResult = await _conversationService.GetConversationByIdAsync(conversationId, userId);
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
                        cancellationToken: cancellationToken);
                }

                await _hubContext.Clients.Group($"conversation_{conversationId}").SendAsync("MessageReceived", messageDto);

                foreach (var p in conv.Participants)
                {
                    await _hubContext.Clients.Group($"user_{p.UserId}").SendAsync("ConversationUpdated", conv);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast message or create notifications");
        }

        return CreatedAtAction(nameof(GetMessages), new { conversationId }, messageDto);
    }

    /// <summary>
    /// Mark messages as read in a conversation
    /// </summary>
    [HttpPost("{conversationId}/read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAsRead(Guid conversationId)
    {
        var userId = GetUserId();
        var result = await _conversationService.MarkMessagesAsReadAsync(conversationId, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    /// <summary>
    /// Get or create course chat
    /// </summary>
    [HttpGet("course/{courseId}")]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourseChat(Guid courseId)
    {
        var userId = GetUserId();
        var result = await _conversationService.GetOrCreateCourseChatAsync(courseId, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get pending conversation requests
    /// </summary>
    [HttpGet("requests/pending")]
    [ProducesResponseType(typeof(List<ConversationRequestDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingRequests()
    {
        var userId = GetUserId();
        var result = await _conversationService.GetPendingRequestsAsync(userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Send a conversation request
    /// </summary>
    [HttpPost("requests")]
    [ProducesResponseType(typeof(ConversationRequestDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> SendRequest([FromBody] SendConversationRequestRequest request)
    {
        var userId = GetUserId();
        var result = await _conversationService.SendConversationRequestAsync(request, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetPendingRequests), result.Value);
    }

    /// <summary>
    /// Accept a conversation request
    /// </summary>
    [HttpPost("requests/{requestId}/accept")]
    [ProducesResponseType(typeof(ConversationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptRequest(Guid requestId)
    {
        var userId = GetUserId();
        var result = await _conversationService.AcceptConversationRequestAsync(requestId, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Reject a conversation request
    /// </summary>
    [HttpPost("requests/{requestId}/reject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RejectRequest(Guid requestId)
    {
        var userId = GetUserId();
        var result = await _conversationService.RejectConversationRequestAsync(requestId, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    /// <summary>
    /// Block a user
    /// </summary>
    [HttpPost("block")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> BlockUser([FromBody] BlockUserRequest request)
    {
        var userId = GetUserId();
        var result = await _conversationService.BlockUserAsync(request.UserId, userId, request.Reason);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    /// <summary>
    /// Unblock a user
    /// </summary>
    [HttpPost("unblock/{userId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UnblockUser(Guid userId)
    {
        var currentUserId = GetUserId();
        var result = await _conversationService.UnblockUserAsync(userId, currentUserId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    /// <summary>
    /// Report a user
    /// </summary>
    [HttpPost("report")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReportUser([FromBody] ReportUserRequest request)
    {
        var userId = GetUserId();
        var result = await _conversationService.ReportUserAsync(request, userId);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }
}











