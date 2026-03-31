using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Exam;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("7. Exams")]
public class ExamsController : ControllerBase
{
    private readonly IExamService _examService;
    private readonly ILogger<ExamsController> _logger;

    public ExamsController(IExamService examService, ILogger<ExamsController> logger)
    {
        _examService = examService;
        _logger = logger;
    }

    /// <summary>
    /// Get exam by ID (Admin, Instructor, Student can view)
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ExamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetExam(Guid id, CancellationToken cancellationToken)
    {
        var result = await _examService.GetByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get exams for a course (Admin, Instructor, Student can view)
    /// </summary>
    [HttpGet("course/{courseId}")]
    [ProducesResponseType(typeof(PagedResult<ExamDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCourseExams(Guid courseId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var result = await _examService.GetByCourseAsync(courseId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create exam (Admin and Instructor can create)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(ExamDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateExam([FromBody] CreateExamRequest request, CancellationToken cancellationToken)
    {
        var result = await _examService.CreateAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetExam), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Update exam (Admin and Instructor can update - ownership checked in service)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(ExamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateExam(Guid id, [FromBody] CreateExamRequest request, CancellationToken cancellationToken)
    {
        var result = await _examService.UpdateAsync(id, request, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete exam (Admin and Instructor can delete)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteExam(Guid id, CancellationToken cancellationToken)
    {
        var result = await _examService.DeleteAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Start exam (Student can attempt)
    /// </summary>
    [HttpPost("start")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(StartExamResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StartExam([FromBody] StartExamRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _examService.StartExamAsync(request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Submit exam (Student can submit)
    /// </summary>
    [HttpPost("submit")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(ExamAttemptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitExam([FromBody] SubmitExamRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _examService.SubmitExamAsync(request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get exam results with correct answers (Student can view their own submitted attempts)
    /// NOTE: This route must come before "attempts/{attemptId}" to avoid route conflicts
    /// </summary>
    [HttpGet("attempts/{attemptId}/results")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(ExamResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetExamResults(Guid attemptId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _examService.GetExamResultAsync(attemptId, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get my exam attempt (Student can view their own attempts)
    /// </summary>
    [HttpGet("attempts/{attemptId}")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(ExamAttemptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyAttempt(Guid attemptId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _examService.GetAttemptAsync(attemptId, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get my exam attempts (Student can view their own attempts)
    /// </summary>
    [HttpGet("attempts/me")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(PagedResult<ExamAttemptDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyAttempts([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _examService.GetAttemptsByUserAsync(userId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get all attempts for an exam (Admin and Instructor can view - ownership checked in service)
    /// </summary>
    [HttpGet("{examId}/attempts")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(PagedResult<ExamAttemptDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetExamAttempts(Guid examId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var result = await _examService.GetAttemptsByExamAsync(examId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get a student's full submission for grading (Instructor only - questions + answers)
    /// </summary>
    [HttpGet("attempts/{attemptId}/submission")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(ExamResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAttemptSubmission(Guid attemptId, CancellationToken cancellationToken)
    {
        var instructorId = User.GetRequiredUserId();
        var result = await _examService.GetAttemptSubmissionForInstructorAsync(attemptId, instructorId, cancellationToken);

        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Update a student's exam attempt score (Instructor only - for manual grading)
    /// </summary>
    [HttpPatch("attempts/{attemptId}/score")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(ExamAttemptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAttemptScore(Guid attemptId, [FromBody] UpdateAttemptScoreRequest request, CancellationToken cancellationToken)
    {
        var instructorId = User.GetRequiredUserId();
        var result = await _examService.UpdateAttemptScoreAsync(attemptId, instructorId, request, cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Publish a student's exam score so they can see their grade and receive a notification (Instructor only)
    /// </summary>
    [HttpPost("attempts/{attemptId}/publish")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(ExamAttemptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PublishAttemptScore(Guid attemptId, CancellationToken cancellationToken)
    {
        var instructorId = User.GetRequiredUserId();
        var result = await _examService.PublishAttemptScoreAsync(attemptId, instructorId, cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }
}









