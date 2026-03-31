namespace AcademixLMS.Application.DTOs.Progress;

public class LessonProgressDto
{
    public Guid Id { get; set; }
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; }
    public bool IsCompleted { get; set; }
    public int WatchedDurationSeconds { get; set; }
    public int TotalDurationSeconds { get; set; }
    public DateTime LastWatchedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CourseProgressDto
{
    public Guid CourseId { get; set; }
    public int TotalLessons { get; set; }
    public int CompletedLessons { get; set; }
    public decimal ProgressPercentage { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}

public class UpdateLessonProgressRequest
{
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; }
    public int WatchedDurationSeconds { get; set; }
    public int TotalDurationSeconds { get; set; }
    public bool IsCompleted { get; set; } = false;
}

public class MarkLessonCompletedRequest
{
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; }
    public int TotalDurationSeconds { get; set; }
}


