namespace AcademixLMS.Application.DTOs.Course;

public class CertificateDto
{
    public bool Eligible { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    /// <summary>Course overview for display on the certificate.</summary>
    public string? CourseDescription { get; set; }
    /// <summary>Planned instruction hours (workload), when set on the course.</summary>
    public decimal? ExpectedDurationHours { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public DateTime IssuedAt { get; set; }
    public string CertificateId { get; set; } = string.Empty;
}
