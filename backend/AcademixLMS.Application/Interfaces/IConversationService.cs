using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Messaging;

namespace AcademixLMS.Application.Interfaces;

public interface IConversationService
{
    // Conversations
    Task<Result<List<ConversationDto>>> GetUserConversationsAsync(Guid userId);
    Task<Result<ConversationDto>> GetConversationByIdAsync(Guid conversationId, Guid userId);
    Task<Result<ConversationDto>> CreateConversationAsync(CreateConversationRequest request, Guid userId);
    
    // Messages
    Task<Result<List<ConversationMessageDto>>> GetConversationMessagesAsync(Guid conversationId, Guid userId, int pageNumber = 1, int pageSize = 50);
    Task<Result<ConversationMessageDto>> SendMessageAsync(SendMessageRequest request, Guid userId);
    Task<Result> MarkMessagesAsReadAsync(Guid conversationId, Guid userId);
    
    // Conversation Requests
    Task<Result<List<ConversationRequestDto>>> GetPendingRequestsAsync(Guid userId);
    Task<Result<ConversationRequestDto>> SendConversationRequestAsync(SendConversationRequestRequest request, Guid userId);
    Task<Result<ConversationDto>> AcceptConversationRequestAsync(Guid requestId, Guid userId);
    Task<Result> RejectConversationRequestAsync(Guid requestId, Guid userId);
    
    // Block and Report
    Task<Result> BlockUserAsync(Guid blockedUserId, Guid userId, string? reason = null);
    Task<Result> UnblockUserAsync(Guid blockedUserId, Guid userId);
    Task<Result<List<Guid>>> GetBlockedUserIdsAsync(Guid userId);
    Task<Result> ReportUserAsync(ReportUserRequest request, Guid userId);
    
    // Course Chat
    Task<Result<ConversationDto>> GetOrCreateCourseChatAsync(Guid courseId, Guid userId);
}











