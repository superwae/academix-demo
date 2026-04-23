using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// A bulk license bought by an <see cref="Organization"/> (Type B — Employer) for a public <see cref="Course"/>.
/// Grants N seats that the org admin can assign to employees, producing standard enrollments.
/// </summary>
public class CourseLicense : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid CourseId { get; set; }

    public int SeatsTotal { get; set; }
    public int SeatsUsed { get; set; }

    public decimal PricePerSeat { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "ILS";

    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }

    public CourseLicenseStatus Status { get; set; } = CourseLicenseStatus.Pending;

    // Navigation
    public Organization Organization { get; set; } = null!;
    public Course Course { get; set; } = null!;
    public ICollection<Enrollment> Assignments { get; set; } = new List<Enrollment>();

    public int SeatsAvailable => SeatsTotal - SeatsUsed;
}
