namespace AcademixLMS.Application.DTOs.Lesson;

public class LessonDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Guid? SectionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int? DurationMinutes { get; set; }
    public int Order { get; set; }
    public bool IsPreview { get; set; }
}

public class LessonSectionDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Order { get; set; }
}

public class CreateLessonRequest
{
    public Guid CourseId { get; set; }
    public Guid? SectionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int? DurationMinutes { get; set; }
    public int Order { get; set; }
    public bool IsPreview { get; set; } = false;
}

public class UpdateLessonRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int? DurationMinutes { get; set; }
    public int? Order { get; set; }
    public bool? IsPreview { get; set; }
    public Guid? SectionId { get; set; }
}

public class CreateLessonSectionRequest
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Order { get; set; }
}

public class UpdateLessonSectionRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Order { get; set; }
}


