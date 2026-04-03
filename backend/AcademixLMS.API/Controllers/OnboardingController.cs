using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Onboarding;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("9. User Onboarding")]
public class OnboardingController : ControllerBase
{
    private readonly IOnboardingService _onboardingService;
    private readonly IApplicationDbContext _context;
    private readonly ILogger<OnboardingController> _logger;

    public OnboardingController(
        IOnboardingService onboardingService,
        IApplicationDbContext context,
        ILogger<OnboardingController> logger)
    {
        _onboardingService = onboardingService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get available interest categories and topics for onboarding
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(OnboardingCategoriesResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken = default)
    {
        var result = await _onboardingService.GetCategoriesAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Get the current user's interests
    /// </summary>
    [HttpGet("interests")]
    [ProducesResponseType(typeof(UserOnboardingDataResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUserInterests(CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _onboardingService.GetUserInterestsAsync(userId.Value, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Save user interests during onboarding
    /// </summary>
    [HttpPost("interests")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SaveUserInterests(
        [FromBody] SaveUserInterestsRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _onboardingService.SaveUserInterestsAsync(userId.Value, request, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { message = "Interests saved successfully" });
    }

    /// <summary>
    /// Mark onboarding as complete for the current user
    /// </summary>
    [HttpPost("complete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CompleteOnboarding(CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _onboardingService.CompleteOnboardingAsync(userId.Value, cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { message = "Onboarding completed" });
    }

    /// <summary>
    /// Check if user has completed onboarding
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(OnboardingStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetOnboardingStatus(CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _onboardingService.GetOnboardingStatusAsync(userId.Value, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// DEBUG: Get user interests and enrollments by email (for debugging recommendation issues).
    /// Only available in Development and restricted to Admin/SuperAdmin.
    /// </summary>
    [HttpGet("debug/interests/{email}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DebugGetUserInterests(string email, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return NotFound(new { message = $"User with email '{email}' not found" });
        }

        var interests = await _context.UserInterests
            .Where(i => i.UserId == user.Id && !i.IsDeleted)
            .Select(i => new
            {
                i.Id,
                i.Category,
                i.Topic,
                PreferredLevel = i.PreferredLevel.HasValue ? i.PreferredLevel.Value.ToString() : null,
                i.InterestScore,
                i.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var learningGoals = await _context.UserLearningGoals
            .Where(g => g.UserId == user.Id && !g.IsDeleted)
            .Select(g => new { g.Goal, g.Priority })
            .ToListAsync(cancellationToken);

        var enrollments = await _context.Enrollments
            .Include(e => e.Course)
            .Where(e => e.UserId == user.Id && !e.IsDeleted)
            .Select(e => new
            {
                CourseId = e.CourseId,
                CourseTitle = e.Course.Title,
                CourseCategory = e.Course.Category,
                EnrolledAt = e.EnrolledAt,
                Status = e.Status.ToString()
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            UserId = user.Id,
            Email = user.Email,
            Name = user.FullName,
            InterestCount = interests.Count,
            Interests = interests,
            LearningGoals = learningGoals,
            EnrollmentCount = enrollments.Count,
            Enrollments = enrollments,
            Summary = new {
                InterestCategories = interests.Select(i => i.Category).Distinct().ToList(),
                EnrollmentCategories = enrollments.Select(e => e.CourseCategory).Distinct().ToList()
            }
        });
    }

    /// <summary>
    /// DEBUG: Clear all demo enrollments for a user (for testing recommendation based on interests only).
    /// Only available in Development and restricted to Admin/SuperAdmin.
    /// </summary>
    [HttpDelete("debug/enrollments/{email}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DebugClearEnrollments(string email, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return NotFound(new { message = $"User with email '{email}' not found" });
        }

        var enrollments = await _context.Enrollments
            .Where(e => e.UserId == user.Id && !e.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var enrollment in enrollments)
        {
            enrollment.IsDeleted = true;
            enrollment.DeletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Cleared {Count} enrollments for user {Email}", enrollments.Count, email);

        return Ok(new
        {
            message = $"Cleared {enrollments.Count} enrollments for user {email}",
            enrollmentsCleared = enrollments.Count
        });
    }
}
