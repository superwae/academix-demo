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
    
    // Navigation Properties
    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
    public CourseSection Section { get; set; } = null!;
}


