using AcademixLMS.Domain.Entities;

namespace AcademixLMS.Application.DTOs.Course;

public class CourseMaterialDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Guid? LessonId { get; set; }
    public string? LessonTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSizeBytes { get; set; }
    public int SortOrder { get; set; }
    public CourseMaterialKind Kind { get; set; }
}

public class CreateCourseMaterialRequest
{
    public Guid CourseId { get; set; }
    public Guid? LessonId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSizeBytes { get; set; }
    public int SortOrder { get; set; }
    public CourseMaterialKind Kind { get; set; } = CourseMaterialKind.File;
}
