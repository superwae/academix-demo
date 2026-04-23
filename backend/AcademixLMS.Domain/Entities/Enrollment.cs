using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Enrollment - represents a student's enrollment in a course section
/// </summary>
public class Enrollment : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    public Guid SectionId { get; set; }
    
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;

    public decimal ProgressPercentage { get; set; } = 0;
    public DateTime? CompletedAt { get; set; }

    /// <summary>Organization that paid for this enrollment (seat assigned from a <see cref="CourseLicense"/>). Null for self-enrolled.</summary>
    public Guid? AssignedByOrgId { get; set; }

    /// <summary>Source license, when the enrollment came from a bulk org purchase.</summary>
    public Guid? CourseLicenseId { get; set; }

    /// <summary>Deadline set by the assigning org admin; null when no explicit due date.</summary>
    public DateTime? DueDate { get; set; }

    // Navigation Properties
    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
    public CourseSection Section { get; set; } = null!;
    public Organization? AssignedByOrg { get; set; }
    public CourseLicense? CourseLicense { get; set; }
}


