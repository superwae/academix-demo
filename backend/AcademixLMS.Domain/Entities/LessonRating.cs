using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>Student rating for a single lesson (lecture).</summary>
public class LessonRating : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }

    public User User { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
