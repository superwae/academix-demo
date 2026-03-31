using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Review;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("5. Reviews & Ratings")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;
    private readonly ILogger<ReviewsController> _logger;

    public ReviewsController(IReviewService reviewService, ILogger<ReviewsController> logger)
    {
        _reviewService = reviewService;
        _logger = logger;
    }

    /// <summary>
    /// Get reviews for a course (public endpoint, only visible reviews)
    /// </summary>
    [HttpGet("course/{courseId}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedResult<ReviewDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCourseReviews(Guid courseId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var isAdmin = User.Identity?.IsAuthenticated == true && (User.HasRole("Admin") || User.HasRole("SuperAdmin"));
        
        var result = await _reviewService.GetByCourseAsync(courseId, request, includeHidden: isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get my reviews (authenticated users only)
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(PagedResult<ReviewDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetMyReviews([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _reviewService.GetByUserAsync(userId, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get my review for a specific course
    /// </summary>
    [HttpGet("course/{courseId}/my-review")]
    [Authorize]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyReviewForCourse(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _reviewService.GetUserReviewForCourseAsync(userId, courseId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        if (result.Value == null)
            return NotFound("You have not reviewed this course yet.");

        return Ok(result.Value);
    }

    /// <summary>
    /// Get review by ID
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReview(Guid id, CancellationToken cancellationToken)
    {
        var result = await _reviewService.GetByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        // Visibility check: Only show visible reviews to non-admin users
        var isAdmin = User.Identity?.IsAuthenticated == true && (User.HasRole("Admin") || User.HasRole("SuperAdmin"));
        if (!isAdmin && !result.Value!.IsVisible)
        {
            return NotFound("Review not found.");
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a review (Students can review courses they're enrolled in)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireStudent")]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        
        var result = await _reviewService.CreateAsync(request, userId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetReview), new { id = result.Value!.Id }, result.Value);
    }

    /// <summary>
    /// Update a review (Users can update their own reviews, Admins can update any)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    [ProducesResponseType(typeof(ReviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] UpdateReviewRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        
        var result = await _reviewService.UpdateAsync(id, request, userId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete a review (Users can delete their own reviews, Admins can delete any)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteReview(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        
        var result = await _reviewService.DeleteAsync(id, userId, isAdmin, cancellationToken);
        
        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }
}






















