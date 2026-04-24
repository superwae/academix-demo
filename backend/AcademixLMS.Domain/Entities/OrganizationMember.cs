using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Membership link between a <see cref="User"/> and an <see cref="Organization"/> with a scoped role.
/// </summary>
public class OrganizationMember : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }

    public OrgMemberRole Role { get; set; }

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    /// <summary>When the member was removed/resigned. Null while active.</summary>
    public DateTime? LeftAt { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Optional internal identifier (employee ID, student number).</summary>
    public string? ExternalReference { get; set; }

    /// <summary>Invite token set when a member was invited but hasn't accepted yet.</summary>
    public string? InviteToken { get; set; }
    public DateTime? InviteSentAt { get; set; }
    public DateTime? InviteExpiresAt { get; set; }
    public DateTime? InviteAcceptedAt { get; set; }

    // Navigation
    public Organization Organization { get; set; } = null!;
    public User User { get; set; } = null!;
}
