using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.AI;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("8. AI - Analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(
        IAnalyticsService analyticsService,
        ILogger<AnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    /// <summary>
    /// Get analytics dashboard overview (Admin only)
    /// </summary>
    [HttpGet("dashboard")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetDashboardAnalyticsAsync(cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get analytics for a specific student
    /// </summary>
    /// <param name="studentId">The student's user ID</param>
    [HttpGet("students/{studentId:guid}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStudentAnalytics(Guid studentId, CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetStudentAnalyticsAsync(studentId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get analytics for the current user (student self-view)
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyAnalytics(CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _analyticsService.GetStudentAnalyticsAsync(userId.Value, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get analytics for a specific course
    /// </summary>
    /// <param name="courseId">The course ID</param>
    [HttpGet("courses/{courseId:guid}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourseAnalytics(Guid courseId, CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetCourseAnalyticsAsync(courseId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get all at-risk students platform-wide (Admin only)
    /// </summary>
    /// <param name="minimumRisk">Minimum risk level to include (Low, Medium, High, Critical)</param>
    /// <param name="limit">Maximum number of students to return</param>
    [HttpGet("at-risk")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAtRiskStudents(
        [FromQuery] RiskLevel? minimumRisk = null,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetAtRiskStudentsAsync(minimumRisk, limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get at-risk students for a specific course
    /// </summary>
    /// <param name="courseId">The course ID</param>
    [HttpGet("courses/{courseId:guid}/at-risk")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourseAtRiskStudents(Guid courseId, CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetCourseAtRiskStudentsAsync(courseId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get analytics for a specific instructor
    /// </summary>
    /// <param name="instructorId">The instructor's user ID</param>
    [HttpGet("instructors/{instructorId:guid}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInstructorAnalytics(Guid instructorId, CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetInstructorAnalyticsAsync(instructorId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get instructor analytics for the current user (instructor self-view)
    /// </summary>
    [HttpGet("instructors/me")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyInstructorAnalytics(CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _analyticsService.GetInstructorAnalyticsAsync(userId.Value, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get lesson-level analytics for a course
    /// </summary>
    /// <param name="courseId">The course ID</param>
    [HttpGet("courses/{courseId:guid}/lessons")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLessonAnalytics(Guid courseId, CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.GetLessonAnalyticsAsync(courseId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Predict final grade for a student in a specific course
    /// </summary>
    /// <param name="studentId">The student's user ID</param>
    /// <param name="courseId">The course ID</param>
    [HttpGet("predict-grade")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PredictGrade(
        [FromQuery] Guid studentId,
        [FromQuery] Guid courseId,
        CancellationToken cancellationToken = default)
    {
        var result = await _analyticsService.PredictStudentGradeAsync(studentId, courseId, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(new { predictedGrade = result.Value });
    }
}
