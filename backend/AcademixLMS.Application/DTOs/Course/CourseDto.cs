namespace AcademixLMS.Application.DTOs.Course;

/// <summary>Certificate copy shown on completion certificates (create/update payload).</summary>
public class CertificateSettingsDto
{
    public bool IssueCertificates { get; set; }
    public string? Summary { get; set; }
    public decimal? DisplayHours { get; set; }
}

public class CourseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string ProviderType { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public Guid InstructorId { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public int RatingCount { get; set; }
    public bool IsFeatured { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string? ThumbnailUrl { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<CourseSectionDto> Sections { get; set; } = new();
    public DateTime CreatedAt { get; set; }

    /// <summary>Planned total hours (instruction).</summary>
    public decimal? ExpectedDurationHours { get; set; }

    /// <summary>Course run start (calendar).</summary>
    public DateTime? CourseStartDate { get; set; }

    /// <summary>Course run end (calendar).</summary>
    public DateTime? CourseEndDate { get; set; }

    public bool IssueCertificates { get; set; }
    public string? CertificateSummary { get; set; }
    public decimal? CertificateDisplayHours { get; set; }
}

public class CourseSectionDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LocationLabel { get; set; } = string.Empty;
    public string? JoinUrl { get; set; }
    public int MaxSeats { get; set; }
    public int SeatsRemaining { get; set; }
    public bool IsActive { get; set; }
    public List<MeetingTimeDto> MeetingTimes { get; set; } = new();
}

public class MeetingTimeDto
{
    public Guid Id { get; set; }
    public string Day { get; set; } = string.Empty;
    public int StartMinutes { get; set; }
    public int EndMinutes { get; set; }
    public string StartTime { get; set; } = string.Empty; // Formatted "10:00 AM"
    public string EndTime { get; set; } = string.Empty; // Formatted "11:30 AM"
}

public class CreateCourseRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string ProviderType { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public Guid InstructorId { get; set; }
    public decimal? Price { get; set; }
    public string? ThumbnailUrl { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<CreateSectionRequest> Sections { get; set; } = new();

    public decimal? ExpectedDurationHours { get; set; }
    public DateTime? CourseStartDate { get; set; }
    public DateTime? CourseEndDate { get; set; }

    /// <summary>When set, certificate fields are applied on create. Omitted = no certificates / defaults.</summary>
    public CertificateSettingsDto? Certificate { get; set; }
}

public class UpdateCourseRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public string? Modality { get; set; }
    public string? ProviderType { get; set; }
    public string? ProviderName { get; set; }
    public Guid? InstructorId { get; set; }
    public decimal? Price { get; set; }
    public string? ThumbnailUrl { get; set; }
    public bool? IsFeatured { get; set; }
    public string? Status { get; set; }
    public List<string>? Tags { get; set; }

    public decimal? ExpectedDurationHours { get; set; }
    public DateTime? CourseStartDate { get; set; }
    public DateTime? CourseEndDate { get; set; }

    /// <summary>When present, replaces certificate settings. When null, certificate fields are unchanged.</summary>
    public CertificateSettingsDto? Certificate { get; set; }
}

public class CreateSectionRequest
{
    public string Name { get; set; } = string.Empty;
    public string LocationLabel { get; set; } = string.Empty;
    public string? JoinUrl { get; set; }
    public int MaxSeats { get; set; }
    public List<CreateMeetingTimeRequest> MeetingTimes { get; set; } = new();
}

public class CreateMeetingTimeRequest
{
    public string Day { get; set; } = string.Empty;
    public int StartMinutes { get; set; }
    public int EndMinutes { get; set; }
}


