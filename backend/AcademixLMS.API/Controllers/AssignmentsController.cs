using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Assignment;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("6. Assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;
    private readonly IEnrollmentService _enrollmentService;
    private readonly ILogger<AssignmentsController> _logger;

    public AssignmentsController(IAssignmentService assignmentService, IEnrollmentService enrollmentService, ILogger<AssignmentsController> logger)
    {
        _assignmentService = assignmentService;
        _enrollmentService = enrollmentService;
        _logger = logger;
    }

    /// <summary>
    /// Get assignment by ID (Admin, Instructor, Student can view)
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(AssignmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssignment(Guid id, CancellationToken cancellationToken)
    {
        var result = await _assignmentService.GetByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        var userId = User.GetRequiredUserId();
        if (!await CanViewCourseContentAsync(result.Value!.CourseId, userId, cancellationToken))
            return Forbidden("You do not have access to this assignment.");

        return Ok(result.Value);
    }

    /// <summary>
    /// Get assignments for a course (Admin, Instructor, Student can view)
    /// </summary>
    [HttpGet("course/{courseId}")]
    [ProducesResponseType(typeof(PagedResult<AssignmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCourseAssignments(Guid courseId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        if (!await CanViewCourseContentAsync(courseId, userId, cancellationToken))
            return Forbidden("You do not have access to this course assignments.");

        var result = await _assignmentService.GetByCourseAsync(courseId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get my assignments (Student can view their enrolled courses' assignments)
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(PagedResult<AssignmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyAssignments([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _assignmentService.GetByUserAsync(userId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create assignment (Admin and Instructor can create)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(AssignmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateAssignmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        if (!await CanManageCourseContentAsync(request.CourseId, userId, cancellationToken))
            return Forbidden("You can only create assignments for courses you teach.");

        var result = await _assignmentService.CreateAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetAssignment), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Update assignment (Admin and Instructor can update - ownership checked in service)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(AssignmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAssignment(Guid id, [FromBody] UpdateAssignmentRequest request, CancellationToken cancellationToken)
    {
        var existing = await _assignmentService.GetByIdAsync(id, cancellationToken);
        if (!existing.IsSuccess || existing.Value == null)
            return NotFound(existing.Error);
        var userId = User.GetRequiredUserId();
        if (!await CanManageCourseContentAsync(existing.Value.CourseId, userId, cancellationToken))
            return Forbidden("You can only update assignments for courses you teach.");

        var result = await _assignmentService.UpdateAsync(id, request, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete assignment (Admin and Instructor can delete)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAssignment(Guid id, CancellationToken cancellationToken)
    {
        var existing = await _assignmentService.GetByIdAsync(id, cancellationToken);
        if (!existing.IsSuccess || existing.Value == null)
            return NotFound(existing.Error);
        var userId = User.GetRequiredUserId();
        if (!await CanManageCourseContentAsync(existing.Value.CourseId, userId, cancellationToken))
            return Forbidden("You can only delete assignments for courses you teach.");

        var result = await _assignmentService.DeleteAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Get my submission for an assignment (Student can view their own submission)
    /// </summary>
    [HttpGet("{assignmentId}/my-submission")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(AssignmentSubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMySubmission(Guid assignmentId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _assignmentService.GetSubmissionAsync(assignmentId, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Submit assignment (Student can submit)
    /// </summary>
    [HttpPost("{assignmentId}/submit")]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(AssignmentSubmissionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitAssignment(Guid assignmentId, [FromBody] SubmitAssignmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _assignmentService.SubmitAsync(assignmentId, request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetMySubmission), new { assignmentId }, result.Value);
    }

    /// <summary>
    /// Get all submissions for an assignment (Admin and Instructor can view - ownership checked in service)
    /// </summary>
    [HttpGet("{assignmentId}/submissions")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(PagedResult<AssignmentSubmissionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSubmissions(Guid assignmentId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var existing = await _assignmentService.GetByIdAsync(assignmentId, cancellationToken);
        if (!existing.IsSuccess || existing.Value == null)
            return NotFound(existing.Error);
        var userId = User.GetRequiredUserId();
        if (!await CanManageCourseContentAsync(existing.Value.CourseId, userId, cancellationToken))
            return Forbidden("You can only view submissions for courses you teach.");

        var result = await _assignmentService.GetSubmissionsAsync(assignmentId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Grade a submission (Admin and Instructor can grade - ownership checked in service)
    /// </summary>
    [HttpPost("submissions/{submissionId}/grade")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(AssignmentSubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GradeSubmission(Guid submissionId, [FromBody] GradeSubmissionRequest request, CancellationToken cancellationToken)
    {
        var gradedBy = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        
        var result = await _assignmentService.GradeSubmissionAsync(submissionId, request, gradedBy, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    private async Task<bool> CanViewCourseContentAsync(Guid courseId, Guid userId, CancellationToken cancellationToken)
    {
        if (User.HasRole("Admin") || User.HasRole("SuperAdmin"))
            return true;

        var teaches = await _enrollmentService.VerifyCourseInstructorAsync(courseId, userId, cancellationToken);
        if (teaches.IsSuccess && teaches.Value)
            return true;

        var enrolled = await _enrollmentService.HasActiveEnrollmentAsync(userId, courseId, cancellationToken);
        return enrolled.IsSuccess && enrolled.Value;
    }

    private async Task<bool> CanManageCourseContentAsync(Guid courseId, Guid userId, CancellationToken cancellationToken)
    {
        if (User.HasRole("Admin") || User.HasRole("SuperAdmin"))
            return true;

        var teaches = await _enrollmentService.VerifyCourseInstructorAsync(courseId, userId, cancellationToken);
        return teaches.IsSuccess && teaches.Value;
    }

    private ObjectResult Forbidden(string message) =>
        StatusCode(StatusCodes.Status403Forbidden, new { error = message });
}






















