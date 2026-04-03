using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Subscription;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("Subscription Plans")]
public class SubscriptionPlansController : ControllerBase
{
    private readonly ISubscriptionPlanService _subscriptionPlanService;
    private readonly ILogger<SubscriptionPlansController> _logger;

    public SubscriptionPlansController(ISubscriptionPlanService subscriptionPlanService, ILogger<SubscriptionPlansController> logger)
    {
        _subscriptionPlanService = subscriptionPlanService;
        _logger = logger;
    }

    /// <summary>
    /// List all active subscription plans (public pricing page)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<SubscriptionPlanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
    {
        var result = await _subscriptionPlanService.GetAllPlansAsync(cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get subscription plan by ID
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(SubscriptionPlanDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPlan(Guid id, CancellationToken cancellationToken)
    {
        var result = await _subscriptionPlanService.GetPlanByIdAsync(id, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Create a new subscription plan (Admin or SuperAdmin)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(SubscriptionPlanDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreatePlan([FromBody] CreateSubscriptionPlanRequest request, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("SuperAdmin") && !User.IsInRole("Admin"))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Insufficient permissions to create subscription plans." });

        try
        {
            var userId = User.GetRequiredUserId();
            var result = await _subscriptionPlanService.CreatePlanAsync(request, userId, cancellationToken);

            if (!result.IsSuccess || result.Value == null)
                return BadRequest(new { error = result.Error ?? "Failed to create subscription plan." });

            return CreatedAtAction(nameof(GetPlan), new { id = result.Value.Id }, result.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating subscription plan.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An unexpected error occurred." });
        }
    }

    /// <summary>
    /// Update a subscription plan (Admin or SuperAdmin)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(SubscriptionPlanDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] UpdateSubscriptionPlanRequest request, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("SuperAdmin") && !User.IsInRole("Admin"))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Insufficient permissions to update subscription plans." });

        try
        {
            var userId = User.GetRequiredUserId();
            var result = await _subscriptionPlanService.UpdatePlanAsync(id, request, userId, cancellationToken);

            if (!result.IsSuccess || result.Value == null)
            {
                if (result.Error?.Contains("not found") == true)
                    return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error ?? "Failed to update subscription plan." });
            }

            return Ok(result.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating subscription plan {PlanId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An unexpected error occurred." });
        }
    }

    /// <summary>
    /// Delete a subscription plan (Admin or SuperAdmin)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlan(Guid id, CancellationToken cancellationToken)
    {
        if (!User.IsInRole("SuperAdmin") && !User.IsInRole("Admin"))
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Insufficient permissions to delete subscription plans." });

        try
        {
            var userId = User.GetRequiredUserId();
            var result = await _subscriptionPlanService.DeletePlanAsync(id, userId, cancellationToken);

            if (!result.IsSuccess)
            {
                if (result.Error?.Contains("not found") == true)
                    return NotFound(new { error = result.Error });
                return BadRequest(new { error = result.Error ?? "Failed to delete subscription plan." });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting subscription plan {PlanId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An unexpected error occurred." });
        }
    }
}
