using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/courses/{courseId:guid}/materials")]
[ApiVersion("1.0")]
[Authorize(Policy = "RequireStudent")]
[Tags("3. Courses")]
public class CourseMaterialsController : ControllerBase
{
    private readonly ICourseMaterialService _materials;

    public CourseMaterialsController(ICourseMaterialService materials)
    {
        _materials = materials;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<CourseMaterialDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMaterials(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _materials.GetForCourseAsync(courseId, userId, isAdmin, cancellationToken);
        if (!result.IsSuccess)
            return Forbid();
        return Ok(result.Value);
    }

    [HttpPost]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(CourseMaterialDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateMaterial(
        Guid courseId,
        [FromBody] CreateCourseMaterialRequest body,
        CancellationToken cancellationToken)
    {
        body.CourseId = courseId;
        var instructorId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _materials.CreateAsync(body, instructorId, isAdmin, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return CreatedAtAction(nameof(GetMaterials), new { courseId }, result.Value);
    }

    [HttpDelete("{materialId:guid}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteMaterial(Guid courseId, Guid materialId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _materials.DeleteAsync(materialId, userId, isAdmin, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return NoContent();
    }
}
