using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Lesson;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("6. Lessons")]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _lessonService;
    private readonly ILogger<LessonsController> _logger;

    public LessonsController(ILessonService lessonService, ILogger<LessonsController> logger)
    {
        _lessonService = lessonService;
        _logger = logger;
    }

    /// <summary>
    /// Get lesson by ID (Students and Instructors can view)
    /// </summary>
    [HttpGet("{id}")]
    [Authorize]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLesson(Guid id, CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get all lessons for a course (Students and Instructors can view)
    /// </summary>
    [HttpGet("course/{courseId}")]
    [Authorize]
    [ProducesResponseType(typeof(List<LessonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourseLessons(Guid courseId, CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetByCourseAsync(courseId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get all lessons for a section (Students and Instructors can view)
    /// </summary>
    [HttpGet("section/{sectionId}")]
    [Authorize]
    [ProducesResponseType(typeof(List<LessonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSectionLessons(Guid sectionId, CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetBySectionAsync(sectionId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a new lesson (Instructors and Admins only)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateLesson([FromBody] CreateLessonRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _lessonService.CreateAsync(request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetLesson), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Update a lesson (Instructors and Admins only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLesson(Guid id, [FromBody] UpdateLessonRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _lessonService.UpdateAsync(id, request, userId, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete a lesson (Instructors and Admins only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLesson(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _lessonService.DeleteAsync(id, userId, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Get all lesson sections for a course (Students and Instructors can view)
    /// </summary>
    [HttpGet("sections/course/{courseId}")]
    [Authorize]
    [ProducesResponseType(typeof(List<LessonSectionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourseSections(Guid courseId, CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetCourseSectionsAsync(courseId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get lesson section by ID (Students and Instructors can view)
    /// </summary>
    [HttpGet("sections/{id}")]
    [Authorize]
    [ProducesResponseType(typeof(LessonSectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSection(Guid id, CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetSectionByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a new lesson section (Instructors and Admins only)
    /// </summary>
    [HttpPost("sections")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(LessonSectionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSection([FromBody] CreateLessonSectionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _lessonService.CreateSectionAsync(request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetSection), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Update a lesson section (Instructors and Admins only)
    /// </summary>
    [HttpPut("sections/{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(LessonSectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSection(Guid id, [FromBody] UpdateLessonSectionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _lessonService.UpdateSectionAsync(id, request, userId, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete a lesson section (Instructors and Admins only)
    /// </summary>
    [HttpDelete("sections/{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSection(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _lessonService.DeleteSectionAsync(id, userId, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }
}


