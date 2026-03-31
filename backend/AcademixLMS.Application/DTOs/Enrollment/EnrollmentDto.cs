namespace AcademixLMS.Application.DTOs.Enrollment;

public class EnrollmentDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public Guid SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public DateTime EnrolledAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal ProgressPercentage { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CreateEnrollmentRequest
{
    public Guid CourseId { get; set; }
    public Guid SectionId { get; set; }
}

public class UpdateEnrollmentRequest
{
    public string? Status { get; set; }
    public decimal? ProgressPercentage { get; set; }
}

public class MyEnrollmentsDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public Guid SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public DateTime EnrolledAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal ProgressPercentage { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class UpdateProgressRequest
{
    public decimal ProgressPercentage { get; set; }
}


