namespace AcademixLMS.Application.DTOs.AI;

/// <summary>
/// Student analytics with risk assessment and predictions
/// </summary>
public class StudentAnalyticsDto
{
    public Guid UserId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }

    // Engagement Metrics
    public double EngagementScore { get; set; }  // 0-100
    public EngagementLevel EngagementLevel { get; set; }

    // Risk Assessment
    public double RiskScore { get; set; }  // 0-100 (higher = more at risk)
    public RiskLevel RiskLevel { get; set; }
    public List<string> RiskFactors { get; set; } = new();

    // Performance Metrics
    public double AverageGrade { get; set; }
    public double PredictedFinalGrade { get; set; }
    public double CompletionRate { get; set; }

    // Activity Metrics
    public int TotalEnrollments { get; set; }
    public int CompletedCourses { get; set; }
    public int ActiveCourses { get; set; }
    public int DroppedCourses { get; set; }
    public int TotalLessonsWatched { get; set; }
    public int TotalAssignmentsSubmitted { get; set; }
    public int TotalExamsTaken { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public int DaysSinceLastActivity { get; set; }

    // Recommendations
    public List<string> Recommendations { get; set; } = new();
}

public enum EngagementLevel
{
    VeryLow,    // 0-20
    Low,        // 21-40
    Medium,     // 41-60
    High,       // 61-80
    VeryHigh    // 81-100
}

public enum RiskLevel
{
    Low,        // 0-25
    Medium,     // 26-50
    High,       // 51-75
    Critical   // 76-100
}

/// <summary>
/// Course analytics with student performance data
/// </summary>
public class CourseAnalyticsDto
{
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;

    // Enrollment Stats
    public int TotalEnrollments { get; set; }
    public int ActiveStudents { get; set; }
    public int CompletedStudents { get; set; }
    public int DroppedStudents { get; set; }
    public double CompletionRate { get; set; }
    public double DropRate { get; set; }

    // Performance Stats
    public double AverageProgress { get; set; }
    public double AverageGrade { get; set; }
    public double AverageEngagement { get; set; }

    // At-Risk Students
    public int AtRiskStudentCount { get; set; }
    public List<StudentAnalyticsDto> AtRiskStudents { get; set; } = new();

    // Lesson Stats
    public int TotalLessons { get; set; }
    public List<LessonAnalyticsDto> LessonStats { get; set; } = new();

    // Assignment Stats
    public int TotalAssignments { get; set; }
    public double AverageAssignmentScore { get; set; }
    public double AssignmentSubmissionRate { get; set; }

    // Exam Stats
    public int TotalExams { get; set; }
    public double AverageExamScore { get; set; }
    public double ExamPassRate { get; set; }
}

/// <summary>
/// Lesson-level analytics
/// </summary>
public class LessonAnalyticsDto
{
    public Guid LessonId { get; set; }
    public string LessonTitle { get; set; } = string.Empty;
    public int Order { get; set; }

    public int TotalViews { get; set; }
    public int CompletedCount { get; set; }
    public double CompletionRate { get; set; }
    public double AverageWatchPercentage { get; set; }
    public int AverageWatchDurationSeconds { get; set; }

    // Identifies lessons where students drop off
    public bool IsDropoffPoint { get; set; }
    public double DropoffRate { get; set; }
}

/// <summary>
/// Dashboard analytics summary
/// </summary>
public class AnalyticsDashboardDto
{
    // Platform Overview
    public int TotalStudents { get; set; }
    public int TotalInstructors { get; set; }
    public int TotalCourses { get; set; }
    public int TotalEnrollments { get; set; }
    public int ActiveEnrollments { get; set; }

    // Engagement Overview
    public double PlatformEngagementScore { get; set; }
    public int StudentsActiveToday { get; set; }
    public int StudentsActiveThisWeek { get; set; }
    public int StudentsActiveThisMonth { get; set; }

    // Risk Overview
    public int AtRiskStudentCount { get; set; }
    public int CriticalRiskCount { get; set; }
    public int HighRiskCount { get; set; }
    public int MediumRiskCount { get; set; }

    // Performance Overview
    public double AverageCourseCompletion { get; set; }
    public double AverageStudentGrade { get; set; }

    // Trends (last 30 days)
    public List<DailyMetricDto> EnrollmentTrend { get; set; } = new();
    public List<DailyMetricDto> ActivityTrend { get; set; } = new();
    public List<DailyMetricDto> CompletionTrend { get; set; } = new();

    // Top Performers
    public List<StudentAnalyticsDto> TopPerformers { get; set; } = new();

    // Needs Attention
    public List<StudentAnalyticsDto> NeedsAttention { get; set; } = new();

    // Course Rankings
    public List<CourseRankingDto> TopRatedCourses { get; set; } = new();
    public List<CourseRankingDto> MostEnrolledCourses { get; set; } = new();
    public List<CourseRankingDto> HighestCompletionCourses { get; set; } = new();
}

/// <summary>
/// Daily metric for trend charts
/// </summary>
public class DailyMetricDto
{
    public DateTime Date { get; set; }
    public double Value { get; set; }
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// Course ranking entry
/// </summary>
public class CourseRankingDto
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public double MetricValue { get; set; }
    public string MetricLabel { get; set; } = string.Empty;
    public int Rank { get; set; }
}

/// <summary>
/// Instructor analytics
/// </summary>
public class InstructorAnalyticsDto
{
    public Guid InstructorId { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }

    public int TotalCourses { get; set; }
    public int PublishedCourses { get; set; }
    public int TotalStudents { get; set; }
    public int ActiveStudents { get; set; }

    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }

    public double AverageCompletionRate { get; set; }
    public double AverageStudentGrade { get; set; }

    public List<CourseAnalyticsDto> CourseAnalytics { get; set; } = new();
}

/// <summary>
/// A student's enrollment + per-course stats inside a single course owned by the
/// requesting teacher. Used by the teacher's "view student" page.
/// </summary>
public class StudentCourseStatsDto
{
    public Guid EnrollmentId { get; set; }
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string? CourseThumbnailUrl { get; set; }
    public Guid SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty; // Active, Completed, Dropped, etc.
    public DateTime EnrolledAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public double ProgressPercentage { get; set; }

    // Lessons
    public int LessonsCompleted { get; set; }
    public int TotalLessons { get; set; }

    // Assignments
    public int AssignmentsSubmitted { get; set; }
    public int TotalAssignments { get; set; }
    public double? AverageAssignmentScore { get; set; }

    // Exams
    public int ExamsTaken { get; set; }
    public int TotalExams { get; set; }
    public double? AverageExamScore { get; set; }

    public double? OverallGrade { get; set; }
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>
/// Response wrapping a student's enrollments split into active vs completed
/// for the requesting teacher's courses.
/// </summary>
public class StudentInstructorCoursesDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public string? Bio { get; set; }

    public List<StudentCourseStatsDto> ActiveCourses { get; set; } = new();
    public List<StudentCourseStatsDto> CompletedCourses { get; set; } = new();
}

