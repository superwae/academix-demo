using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// A support request raised by any authenticated user. Admins triage + respond.
/// </summary>
public class SupportTicket : BaseEntity
{
    public Guid UserId { get; set; }

    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public SupportTicketCategory Category { get; set; } = SupportTicketCategory.Other;
    public SupportTicketStatus Status { get; set; } = SupportTicketStatus.Open;
    public SupportTicketPriority Priority { get; set; } = SupportTicketPriority.Normal;

    public Guid? AssignedToUserId { get; set; }

    public DateTime? FirstRespondedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public User? AssignedTo { get; set; }
    public ICollection<SupportTicketReply> Replies { get; set; } = new List<SupportTicketReply>();
}
