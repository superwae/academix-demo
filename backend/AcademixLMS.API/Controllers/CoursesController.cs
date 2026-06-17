using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.DTOs.Payment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("3. Courses")]
public class CoursesController : ControllerBase
{
    private readonly ICourseService _courseService;
    private readonly IRevenueSplitService _revenueSplitService;
    private readonly ILogger<CoursesController> _logger;

    public CoursesController(ICourseService courseService, IRevenueSplitService revenueSplitService, ILogger<CoursesController> logger)
    {
        _courseService = courseService;
        _revenueSplitService = revenueSplitService;
        _logger = logger;
    }

    /// <summary>
    /// Preview the revenue split for a given instructor+org+price triple. Used by the
    /// course-creation form so the instructor can see what each party gets before publishing.
    /// </summary>
    [HttpPost("preview-split")]
    [Authorize]
    public async Task<IActionResult> PreviewSplit([FromBody] PreviewSplitForInstructorRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        // If no instructor provided, use the caller's user id.
        var instructorId = request.InstructorId ?? userId.Value;
        var result = await _revenueSplitService.PreviewForInstructorAsync(instructorId, request.OrganizationId, request.Price, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    /// <summary>
    /// Get all published courses (public endpoint)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CourseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCourses([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var result = await _courseService.GetPagedAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get featured courses (public endpoint)
    /// </summary>
    [HttpGet("featured")]
    [ProducesResponseType(typeof(List<CourseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeaturedCourses(CancellationToken cancellationToken)
    {
        var result = await _courseService.GetFeaturedAsync(cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get course by ID (public endpoint)
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourse(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _courseService.GetByIdForUserAsync(id, userId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get courses by category (public endpoint)
    /// </summary>
    [HttpGet("category/{category}")]
    [ProducesResponseType(typeof(PagedResult<CourseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCoursesByCategory(string category, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var result = await _courseService.GetByCategoryAsync(category, request, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get courses for an instructor — only that instructor (or Admin) may list; includes drafts for own courses.
    /// </summary>
    [HttpGet("instructor/{instructorId}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(PagedResult<CourseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetCoursesByInstructor(Guid instructorId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        if (!isAdmin && instructorId != currentUserId)
        {
            return Forbid();
        }

        var result = await _courseService.GetByInstructorAsync(instructorId, request, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a new course (Draft) - Instructor or Admin
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request, CancellationToken cancellationToken)
    {
        // Set InstructorId from current user if not provided or if user is not Admin
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        
        if (!isAdmin && request.InstructorId != currentUserId)
        {
            // Non-admin users can only create courses for themselves
            request.InstructorId = currentUserId;
        }

        var result = await _courseService.CreateAsync(request, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetCourse), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// Update course (Draft) - Instructor (owner only) or Admin
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        // Only Admin can set IsFeatured
        if (!isAdmin && request.IsFeatured.HasValue)
        {
            return Forbid("Only administrators can set featured status.");
        }

        // Only Admin can change Status directly (publishing goes through POST {id}/publish).
        // Strip it for non-admin callers so instructors cannot self-publish via update.
        if (!isAdmin)
        {
            request.Status = null;
        }

        var result = await _courseService.UpdateAsync(id, request, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
        {
            return CourseMutationFailure(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Publish course - Instructor (owner only) or Admin
    /// </summary>
    [HttpPost("{id}/publish")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PublishCourse(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _courseService.PublishAsync(id, currentUserId, isAdmin, cancellationToken);

        if (!result.IsSuccess)
        {
            return CourseMutationFailure(result.Error);
        }

        return Ok(new { message = "Course published successfully." });
    }

    /// <summary>
    /// Archive course - Instructor (owner only) or Admin
    /// </summary>
    [HttpPost("{id}/archive")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ArchiveCourse(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _courseService.ArchiveAsync(id, currentUserId, isAdmin, cancellationToken);

        if (!result.IsSuccess)
        {
            return CourseMutationFailure(result.Error);
        }

        return Ok(new { message = "Course archived successfully." });
    }

    /// <summary>
    /// Delete course - Instructor (owner only) or Admin
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCourse(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _courseService.DeleteAsync(id, currentUserId, isAdmin, cancellationToken);

        if (!result.IsSuccess)
        {
            return CourseMutationFailure(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Clone a course to start a new batch (copies content, resets enrollments/progress)
    /// </summary>
    [HttpPost("{id}/clone")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CloneCourse(Guid id, [FromBody] CloneCourseRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        // Verify the requesting user is the course instructor or an admin
        if (!isAdmin)
        {
            var courseCheck = await _courseService.GetByIdForUserAsync(id, currentUserId, isAdmin, cancellationToken);
            if (!courseCheck.IsSuccess || courseCheck.Value == null)
                return NotFound(courseCheck.Error);

            if (courseCheck.Value.InstructorId != currentUserId)
                return Forbid("You can only clone courses you own.");
        }

        var result = await _courseService.CloneAsync(id, request, currentUserId, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            return CourseMutationFailure(result.Error);
        }

        return CreatedAtAction(nameof(GetCourse), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// Add section to course - Instructor (owner) or Admin
    /// </summary>
    [HttpPost("{id}/sections")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(CourseSectionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddSection(Guid id, [FromBody] CreateSectionRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        var result = await _courseService.AddSectionAsync(id, request, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
        {
            return CourseMutationFailure(result.Error);
        }

        return CreatedAtAction(nameof(GetCourse), new { id }, result.Value);
    }

    /// <summary>
    /// Update section - Instructor (owner) or Admin
    /// </summary>
    [HttpPut("{id}/sections/{sectionId}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSection(Guid id, Guid sectionId, [FromBody] CreateSectionRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        var result = await _courseService.UpdateSectionAsync(id, sectionId, request, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            return CourseMutationFailure(result.Error);
        }

        return Ok(new { message = "Section updated successfully." });
    }

    /// <summary>
    /// Delete section - Instructor (owner) or Admin
    /// </summary>
    [HttpDelete("{id}/sections/{sectionId}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSection(Guid id, Guid sectionId, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        var result = await _courseService.DeleteSectionAsync(id, sectionId, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            return CourseMutationFailure(result.Error);
        }

        return NoContent();
    }

    private IActionResult CourseMutationFailure(string? error)
    {
        var message = string.IsNullOrWhiteSpace(error) ? "The course operation could not be completed." : error;

        if (message.Contains("own", StringComparison.OrdinalIgnoreCase))
            return Forbid(message);

        if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            return NotFound(message);

        return BadRequest(message);
    }
}
