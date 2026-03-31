using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Enrollment;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("4. Enrollments")]
public class EnrollmentsController : ControllerBase
{
    private readonly IEnrollmentService _enrollmentService;
    private readonly ILogger<EnrollmentsController> _logger;

    public EnrollmentsController(IEnrollmentService enrollmentService, ILogger<EnrollmentsController> logger)
    {
        _enrollmentService = enrollmentService;
        _logger = logger;
    }

    /// <summary>
    /// Get my enrollments (Admin and Student can view their own enrollments)
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(PagedResult<EnrollmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyEnrollments([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _enrollmentService.GetByUserAsync(userId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get enrollments for a specific course (Admin or Course Instructor)
    /// </summary>
    [HttpGet("course/{courseId}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(PagedResult<EnrollmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetCourseEnrollments(Guid courseId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        
        // If not admin, verify the user is the instructor of this course
        if (!isAdmin)
        {
            var courseResult = await _enrollmentService.VerifyCourseInstructorAsync(courseId, userId, cancellationToken);
            if (!courseResult.IsSuccess || !courseResult.Value)
            {
                return Forbid("You can only view enrollments for courses you teach.");
            }
        }
        
        var result = await _enrollmentService.GetByCourseAsync(courseId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get enrollment by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(EnrollmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEnrollment(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _enrollmentService.GetByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        // Ownership check: Users can only view their own enrollments (unless Admin)
        if (!User.HasRole("Admin") && !User.HasRole("SuperAdmin") && result.Value!.UserId != userId)
        {
            return Forbid("You can only view your own enrollments.");
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Enroll in a course section (Admin and Student can enroll)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(EnrollmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Enroll([FromBody] CreateEnrollmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _enrollmentService.EnrollAsync(request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetEnrollment), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Unenroll from a course (Admin can unenroll anyone, Student can only unenroll themselves)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unenroll(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        
        var result = await _enrollmentService.UnenrollAsync(id, userId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Update enrollment (Admin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(EnrollmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateEnrollment(Guid id, [FromBody] UpdateEnrollmentRequest request, CancellationToken cancellationToken)
    {
        var result = await _enrollmentService.UpdateAsync(id, request, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Update enrollment progress
    /// </summary>
    [HttpPatch("{id}/progress")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody] UpdateProgressRequest request, CancellationToken cancellationToken)
    {
        var result = await _enrollmentService.UpdateProgressAsync(id, request.ProgressPercentage, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok();
    }

    /// <summary>
    /// Mark enrollment as completed
    /// </summary>
    [HttpPost("{id}/complete")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteEnrollment(Guid id, CancellationToken cancellationToken)
    {
        var result = await _enrollmentService.CompleteAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok();
    }
}


