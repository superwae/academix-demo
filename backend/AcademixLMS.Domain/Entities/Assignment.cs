using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Assignment entity for course assignments
/// </summary>
public class Assignment : BaseEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    
    public DateTime DueAt { get; set; }
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Draft;
    
    public decimal MaxScore { get; set; } = 100;
    public decimal Weight { get; set; } = 1.0m; // For grade calculation
    
    public bool AllowLateSubmission { get; set; } = false;
    public int? LatePenaltyPercent { get; set; }
    
    // Navigation Properties
    public Course Course { get; set; } = null!;
    public ICollection<AssignmentSubmission> Submissions { get; set; } = new List<AssignmentSubmission>();
}

/// <summary>
/// Assignment submission by a student
/// </summary>
public class AssignmentSubmission : BaseEntity
{
    public Guid AssignmentId { get; set; }
    public Guid UserId { get; set; }
    
    public string Text { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? FileUrl { get; set; }
    
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? GradedAt { get; set; }
    public Guid? GradedBy { get; set; } // Instructor/Admin who graded
    /// <summary>Points awarded by the instructor before any automatic late penalty. <see cref="Score"/> stores the final grade after penalty.</summary>
    public decimal? InstructorScore { get; set; }
    public decimal? Score { get; set; }
    public string? Feedback { get; set; }
    public bool IsLate { get; set; }
    
    // Navigation Properties
    public Assignment Assignment { get; set; } = null!;
    public User User { get; set; } = null!;
    public User? Grader { get; set; } // Navigation to grader
}


