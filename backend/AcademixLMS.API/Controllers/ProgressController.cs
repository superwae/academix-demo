using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Progress;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("5. Progress")]
public class ProgressController : ControllerBase
{
    private readonly IProgressService _progressService;
    private readonly ILogger<ProgressController> _logger;

    public ProgressController(IProgressService progressService, ILogger<ProgressController> logger)
    {
        _progressService = progressService;
        _logger = logger;
    }

    /// <summary>
    /// Get progress for a specific lesson
    /// </summary>
    [HttpGet("lesson/{lessonId}")]
    [ProducesResponseType(typeof(LessonProgressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLessonProgress(Guid lessonId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _progressService.GetLessonProgressAsync(userId, lessonId, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Update lesson progress (watched duration, completion status)
    /// </summary>
    [HttpPut("lesson")]
    [ProducesResponseType(typeof(LessonProgressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateLessonProgress([FromBody] UpdateLessonProgressRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _progressService.UpdateLessonProgressAsync(userId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Mark a lesson as completed
    /// </summary>
    [HttpPost("lesson/complete")]
    [ProducesResponseType(typeof(LessonProgressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkLessonCompleted([FromBody] MarkLessonCompletedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _progressService.MarkLessonCompletedAsync(userId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get overall progress for a course
    /// </summary>
    [HttpGet("course/{courseId}")]
    [ProducesResponseType(typeof(CourseProgressDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourseProgress(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _progressService.GetCourseProgressAsync(userId, courseId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get progress for all lessons in a course
    /// </summary>
    [HttpGet("course/{courseId}/lessons")]
    [ProducesResponseType(typeof(List<LessonProgressDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourseLessonsProgress(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _progressService.GetCourseLessonsProgressAsync(userId, courseId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get the lesson the user should continue watching (last incomplete lesson)
    /// </summary>
    [HttpGet("course/{courseId}/continue")]
    [ProducesResponseType(typeof(LessonProgressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetContinueWatching(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _progressService.GetContinueWatchingAsync(userId, courseId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        if (result.Value == null)
            return NoContent();

        return Ok(result.Value);
    }
}


