using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.AI;

namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Service for student performance analytics, at-risk detection, and predictions
/// </summary>
public interface IAnalyticsService
{
    /// <summary>
    /// Get comprehensive analytics for a specific student
    /// </summary>
    Task<Result<StudentAnalyticsDto>> GetStudentAnalyticsAsync(Guid studentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get analytics for a specific course
    /// </summary>
    Task<Result<CourseAnalyticsDto>> GetCourseAnalyticsAsync(Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get analytics dashboard overview (admin)
    /// </summary>
    Task<Result<AnalyticsDashboardDto>> GetDashboardAnalyticsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all at-risk students across the platform
    /// </summary>
    Task<Result<List<StudentAnalyticsDto>>> GetAtRiskStudentsAsync(RiskLevel? minimumRisk = null, int limit = 50, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get at-risk students for a specific course
    /// </summary>
    Task<Result<List<StudentAnalyticsDto>>> GetCourseAtRiskStudentsAsync(Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get instructor analytics
    /// </summary>
    Task<Result<InstructorAnalyticsDto>> GetInstructorAnalyticsAsync(Guid instructorId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get lesson-level analytics for a course
    /// </summary>
    Task<Result<List<LessonAnalyticsDto>>> GetLessonAnalyticsAsync(Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Predict final grade for a student in a course
    /// </summary>
    Task<Result<double>> PredictStudentGradeAsync(Guid studentId, Guid courseId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a student's enrollments and per-course stats for ALL courses owned by the
    /// requesting instructor. Splits results into Active vs Completed courses so the
    /// teacher can see current and past students cleanly.
    /// </summary>
    Task<Result<StudentInstructorCoursesDto>> GetStudentInstructorCoursesAsync(Guid studentId, Guid instructorId, CancellationToken cancellationToken = default);
}
