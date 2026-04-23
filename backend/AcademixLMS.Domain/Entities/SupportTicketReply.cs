using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// A message in a support ticket thread. Either the ticket owner or a staff responder.
/// </summary>
public class SupportTicketReply : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid AuthorUserId { get; set; }

    public string Message { get; set; } = string.Empty;

    /// <summary>When true, only staff can see this reply (internal triage note).</summary>
    public bool IsInternal { get; set; } = false;

    // Navigation
    public SupportTicket Ticket { get; set; } = null!;
    public User Author { get; set; } = null!;
}
