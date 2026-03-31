namespace AcademixLMS.Application.DTOs.Messaging;

public class ConversationDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty; // Direct, Course, General
    public Guid? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string? Title { get; set; }
    public DateTime LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
    public ConversationMessageDto? LastMessage { get; set; }
    public List<ConversationParticipantDto> Participants { get; set; } = new();
    public ConversationParticipantDto? OtherParticipant { get; set; } // For Direct conversations
}

public class ConversationParticipantDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public bool IsInstructor { get; set; }
    public DateTime JoinedAt { get; set; }
    public DateTime? LastReadAt { get; set; }
}

public class ConversationMessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string? SenderProfilePictureUrl { get; set; }
    /// <summary>True when sender has Admin or SuperAdmin role (platform staff).</summary>
    public bool SenderIsStaff { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }
}

public class ConversationRequestDto
{
    public Guid Id { get; set; }
    public Guid RequesterId { get; set; }
    public string RequesterName { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;
    public string? RequesterProfilePictureUrl { get; set; }
    public Guid ReceiverId { get; set; }
    public string Status { get; set; } = string.Empty; // Pending, Accepted, Rejected
    public string? Message { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}

public class CreateConversationRequest
{
    public string Type { get; set; } = string.Empty; // Direct, Course
    public Guid? CourseId { get; set; }
    public Guid? OtherUserId { get; set; } // For Direct conversations
}

public class SendMessageRequest
{
    public Guid ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class SendConversationRequestRequest
{
    public Guid ReceiverId { get; set; }
    public string? Message { get; set; }
}

public class AcceptConversationRequestRequest
{
    public Guid RequestId { get; set; }
}

public class RejectConversationRequestRequest
{
    public Guid RequestId { get; set; }
}

public class BlockUserRequest
{
    public Guid UserId { get; set; }
    public string? Reason { get; set; }
}

public class ReportUserRequest
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
}











