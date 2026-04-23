using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Organization — a teaching institution (universities, bootcamps) or an employer (companies buying training for their employees).
/// </summary>
public class Organization : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? Website { get; set; }
    public string? ContactEmail { get; set; }

    public OrganizationType Type { get; set; }

    /// <summary>Primary admin user (the HR contact for employers, the dean for teaching institutions).</summary>
    public Guid OwnerUserId { get; set; }

    /// <summary>Active platform subscription covering this org's seat quota.</summary>
    public Guid? SubscriptionId { get; set; }

    /// <summary>Platform revenue share % for public courses created under this org (Type A). 0-100.</summary>
    public decimal PlatformFeePercent { get; set; } = 15m;

    /// <summary>Org revenue share % for public courses (Type A). 0-100. Teacher gets the remainder.</summary>
    public decimal OrgFeePercent { get; set; } = 30m;

    public bool IsActive { get; set; } = true;

    // Navigation
    public User Owner { get; set; } = null!;
    public Subscription? Subscription { get; set; }
    public ICollection<OrganizationMember> Members { get; set; } = new List<OrganizationMember>();
    public ICollection<Course> Courses { get; set; } = new List<Course>();
    public ICollection<CourseLicense> Licenses { get; set; } = new List<CourseLicense>();
}
