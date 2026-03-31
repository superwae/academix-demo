using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>Downloadable or linked material for a whole course or a specific lesson.</summary>
public class CourseMaterial : BaseEntity
{
    public Guid CourseId { get; set; }
    /// <summary>When null, material applies to the whole course.</summary>
    public Guid? LessonId { get; set; }

    public string Title { get; set; } = string.Empty;
    /// <summary>File URL from storage, or external URL for books.</summary>
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSizeBytes { get; set; }
    public int SortOrder { get; set; }
    /// <summary>0 = file attachment, 1 = book / external reference</summary>
    public CourseMaterialKind Kind { get; set; } = CourseMaterialKind.File;

    public Course Course { get; set; } = null!;
    public Lesson? Lesson { get; set; }
}

public enum CourseMaterialKind
{
    File = 0,
    Book = 1
}
