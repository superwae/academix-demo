using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Lesson entity - represents a single lesson within a course
/// </summary>
public class Lesson : BaseEntity
{
    public Guid CourseId { get; set; }
    public Guid? SectionId { get; set; } // Optional: for organizing lessons into sections
    
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    public string? VideoUrl { get; set; }
    public int? DurationMinutes { get; set; }
    public int Order { get; set; }
    
    public bool IsPreview { get; set; } = false; // Free preview lesson
    
    // Navigation Properties
    public Course Course { get; set; } = null!;
    public LessonSection? Section { get; set; }
    public ICollection<LessonProgress> Progresses { get; set; } = new List<LessonProgress>();
    public ICollection<CourseMaterial> Materials { get; set; } = new List<CourseMaterial>();
    public ICollection<LessonRating> Ratings { get; set; } = new List<LessonRating>();
}

/// <summary>
/// Lesson Section - organizes lessons into sections within a course (e.g., "Introduction", "Advanced Topics")
/// This is different from CourseSection which represents class instances with schedules
/// </summary>
public class LessonSection : BaseEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Order { get; set; }
    
    // Navigation Properties
    public Course Course { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}

/// <summary>
/// Lesson Progress - tracks a user's progress on a specific lesson
/// </summary>
public class LessonProgress : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }
    public Guid CourseId { get; set; } // Denormalized for easier querying
    
    public bool IsCompleted { get; set; } = false;
    public int WatchedDurationSeconds { get; set; } = 0; // Total seconds watched
    public int TotalDurationSeconds { get; set; } = 0; // Total lesson duration in seconds
    
    public DateTime LastWatchedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    
    // Navigation Properties
    public User User { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
    public Course Course { get; set; } = null!;
}


