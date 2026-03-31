using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Course aggregate root - manages course and its related entities
/// </summary>
public class Course : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    
    public CourseLevel Level { get; set; }
    public Modality Modality { get; set; }
    public ProviderType ProviderType { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    
    public Guid InstructorId { get; set; }
    
    public decimal Rating { get; set; } = 0;
    public int RatingCount { get; set; } = 0;
    
    public bool IsFeatured { get; set; } = false;
    public CourseStatus Status { get; set; } = CourseStatus.Draft;
    
    public decimal? Price { get; set; } // Null = Free course
    public string? ThumbnailUrl { get; set; }

    /// <summary>Total expected instruction hours (planned workload).</summary>
    public decimal? ExpectedDurationHours { get; set; }

    /// <summary>First day the course runs (for calendar bounds). UTC date.</summary>
    public DateTime? CourseStartDate { get; set; }

    /// <summary>Last day the course runs (for calendar bounds). UTC date.</summary>
    public DateTime? CourseEndDate { get; set; }

    /// <summary>When true, certificate uses <see cref="CertificateSummary"/> and optional <see cref="CertificateDisplayHours"/> instead of catalog description alone.</summary>
    public bool IssueCertificates { get; set; }

    /// <summary>Short text shown on the certificate (max words enforced in application layer).</summary>
    public string? CertificateSummary { get; set; }

    /// <summary>Optional hours shown on the certificate; when null, <see cref="ExpectedDurationHours"/> is used.</summary>
    public decimal? CertificateDisplayHours { get; set; }

    // Navigation Properties
    public User Instructor { get; set; } = null!;
    public ICollection<CourseSection> Sections { get; set; } = new List<CourseSection>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    public ICollection<CourseTag> CourseTags { get; set; } = new List<CourseTag>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<LessonSection> LessonSections { get; set; } = new List<LessonSection>();
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<CourseMaterial> Materials { get; set; } = new List<CourseMaterial>();
}


