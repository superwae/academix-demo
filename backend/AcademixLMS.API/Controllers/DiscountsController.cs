using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Discount;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("Course Discounts")]
public class DiscountsController : ControllerBase
{
    private readonly IDiscountService _discountService;
    private readonly ILogger<DiscountsController> _logger;

    public DiscountsController(IDiscountService discountService, ILogger<DiscountsController> logger)
    {
        _discountService = discountService;
        _logger = logger;
    }

    /// <summary>
    /// Get discounts for a course (instructor who owns the course)
    /// </summary>
    [HttpGet("course/{courseId}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(List<DiscountDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetCourseDiscounts(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _discountService.GetDiscountsForCourseAsync(courseId, userId, cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("own") == true)
                return Forbid(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a discount for a course (instructor who owns the course)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(DiscountDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateDiscount([FromBody] CreateDiscountRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _discountService.CreateDiscountAsync(request, userId, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            if (result.Error?.Contains("own") == true)
                return Forbid(result.Error);
            return BadRequest(result.Error);
        }

        return CreatedAtAction(nameof(GetCourseDiscounts), new { courseId = result.Value.CourseId }, result.Value);
    }

    /// <summary>
    /// Update a discount (instructor who owns the course)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(typeof(DiscountDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDiscount(Guid id, [FromBody] UpdateDiscountRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _discountService.UpdateDiscountAsync(id, request, userId, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            if (result.Error?.Contains("own") == true)
                return Forbid(result.Error);
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete a discount (instructor who owns the course)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireInstructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDiscount(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _discountService.DeleteDiscountAsync(id, userId, cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("own") == true)
                return Forbid(result.Error);
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Validate a discount code for a course (any authenticated user)
    /// </summary>
    [HttpPost("validate")]
    [Authorize]
    [ProducesResponseType(typeof(ValidateDiscountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ValidateDiscount([FromBody] ValidateDiscountRequest request, CancellationToken cancellationToken)
    {
        var result = await _discountService.ValidateDiscountAsync(request.CourseId, request.Code, cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }
}
