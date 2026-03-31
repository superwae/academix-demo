using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
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
    private readonly ILogger<CoursesController> _logger;

    public CoursesController(ICourseService courseService, ILogger<CoursesController> logger)
    {
        _courseService = courseService;
        _logger = logger;
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
        var result = await _courseService.GetByIdAsync(id, cancellationToken);
        
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

        var result = await _courseService.UpdateAsync(id, request, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
        {
            if (result.Error.Contains("own"))
                return Forbid(result.Error);
            return NotFound(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Publish course - Admin only
    /// </summary>
    [HttpPost("{id}/publish")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PublishCourse(Guid id, CancellationToken cancellationToken)
    {
        var result = await _courseService.PublishAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(new { message = "Course published successfully." });
    }

    /// <summary>
    /// Archive course - Admin only
    /// </summary>
    [HttpPost("{id}/archive")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ArchiveCourse(Guid id, CancellationToken cancellationToken)
    {
        var result = await _courseService.ArchiveAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(new { message = "Course archived successfully." });
    }

    /// <summary>
    /// Delete course - Admin only
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCourse(Guid id, CancellationToken cancellationToken)
    {
        var result = await _courseService.DeleteAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("not found"))
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Add section to course - Instructor (owner) or Admin
    /// </summary>
    [HttpPost("{id}/sections")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(CourseSectionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddSection(Guid id, [FromBody] CreateSectionRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        var result = await _courseService.AddSectionAsync(id, request, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess || result.Value == null)
        {
            if (result.Error.Contains("own"))
                return Forbid(result.Error);
            return NotFound(result.Error);
        }

        return CreatedAtAction(nameof(GetCourse), new { id }, result.Value);
    }

    /// <summary>
    /// Update section - Instructor (owner) or Admin
    /// </summary>
    [HttpPut("{id}/sections/{sectionId}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSection(Guid id, Guid sectionId, [FromBody] CreateSectionRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");

        var result = await _courseService.UpdateSectionAsync(id, sectionId, request, currentUserId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error.Contains("own"))
                return Forbid(result.Error);
            return NotFound(result.Error);
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
            if (result.Error.Contains("own"))
                return Forbid(result.Error);
            return NotFound(result.Error);
        }

        return NoContent();
    }
}
