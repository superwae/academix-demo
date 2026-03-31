using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Conversation entity for messaging system
/// </summary>
public class Conversation : BaseEntity
{
    public ConversationType Type { get; set; }
    public Guid? CourseId { get; set; } // Nullable - only for Course type
    
    public string? Title { get; set; } // Optional title for course chats
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Course? Course { get; set; }
    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
    public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
}

/// <summary>
/// Participant in a conversation
/// </summary>
public class ConversationParticipant : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastReadAt { get; set; }
    
    // Navigation Properties
    public Conversation Conversation { get; set; } = null!;
    public User User { get; set; } = null!;
}

/// <summary>
/// Message in a conversation
/// </summary>
public class ConversationMessage : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? EditedAt { get; set; }
    
    // Navigation Properties
    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
}

/// <summary>
/// Conversation request for student-to-student messaging
/// </summary>
public class ConversationRequest : BaseEntity
{
    public Guid RequesterId { get; set; }
    public Guid ReceiverId { get; set; }
    
    public ConversationRequestStatus Status { get; set; } = ConversationRequestStatus.Pending;
    public string? Message { get; set; } // Optional message with the request
    
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
    
    // Navigation Properties
    public User Requester { get; set; } = null!;
    public User Receiver { get; set; } = null!;
}

/// <summary>
/// Blocked user relationship
/// </summary>
public class BlockedUser : BaseEntity
{
    public Guid BlockerId { get; set; }
    public Guid BlockedUserId { get; set; }
    
    public DateTime BlockedAt { get; set; } = DateTime.UtcNow;
    public string? Reason { get; set; }
    
    // Navigation Properties
    public User Blocker { get; set; } = null!;
    public User Blocked { get; set; } = null!;
}

/// <summary>
/// Reported user
/// </summary>
public class ReportedUser : BaseEntity
{
    public Guid ReporterId { get; set; }
    public Guid ReportedUserId { get; set; }
    
    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime ReportedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsReviewed { get; set; } = false;
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
    
    // Navigation Properties
    public User Reporter { get; set; } = null!;
    public User Reported { get; set; } = null!;
    public User? Reviewer { get; set; }
}


