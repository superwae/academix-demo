using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("8. AI - Recommendations")]
public class RecommendationsController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    private readonly ILogger<RecommendationsController> _logger;

    public RecommendationsController(
        IRecommendationService recommendationService,
        ILogger<RecommendationsController> logger)
    {
        _recommendationService = recommendationService;
        _logger = logger;
    }

    /// <summary>
    /// Get personalized course recommendations for the current user
    /// </summary>
    /// <param name="limit">Maximum number of recommendations per category (default: 10)</param>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetRecommendations([FromQuery] int limit = 10, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _recommendationService.GetRecommendationsAsync(userId.Value, limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get courses similar to a specific course
    /// </summary>
    /// <param name="courseId">The course ID to find similar courses for</param>
    /// <param name="limit">Maximum number of similar courses (default: 6)</param>
    [HttpGet("similar/{courseId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSimilarCourses(Guid courseId, [FromQuery] int limit = 6, CancellationToken cancellationToken = default)
    {
        var result = await _recommendationService.GetSimilarCoursesAsync(courseId, limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get trending courses based on recent enrollment activity
    /// </summary>
    /// <param name="limit">Maximum number of trending courses (default: 10)</param>
    [HttpGet("trending")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTrendingCourses([FromQuery] int limit = 10, CancellationToken cancellationToken = default)
    {
        var result = await _recommendationService.GetTrendingCoursesAsync(limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get courses from instructors the user has previously enrolled with
    /// </summary>
    /// <param name="limit">Maximum number of courses (default: 6)</param>
    [HttpGet("from-instructors")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetFromYourInstructors([FromQuery] int limit = 6, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _recommendationService.GetFromYourInstructorsAsync(userId.Value, limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get new courses in categories the user has shown interest in
    /// </summary>
    /// <param name="limit">Maximum number of courses (default: 6)</param>
    [HttpGet("new-in-field")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetNewInYourField([FromQuery] int limit = 6, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _recommendationService.GetNewInYourFieldAsync(userId.Value, limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Get courses the user has started but not completed
    /// </summary>
    /// <param name="limit">Maximum number of courses (default: 6)</param>
    [HttpGet("continue-learning")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetContinueLearning([FromQuery] int limit = 6, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _recommendationService.GetContinueLearningAsync(userId.Value, limit, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }
}
