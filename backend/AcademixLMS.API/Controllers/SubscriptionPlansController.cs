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
    /// Create a new subscription plan (SuperAdmin only)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(SubscriptionPlanDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreatePlan([FromBody] CreateSubscriptionPlanRequest request, CancellationToken cancellationToken)
    {
        if (!User.HasRole("SuperAdmin"))
            return Forbid("Only SuperAdmin can create subscription plans.");

        var userId = User.GetRequiredUserId();
        var result = await _subscriptionPlanService.CreatePlanAsync(request, userId, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetPlan), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// Update a subscription plan (SuperAdmin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(SubscriptionPlanDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] UpdateSubscriptionPlanRequest request, CancellationToken cancellationToken)
    {
        if (!User.HasRole("SuperAdmin"))
            return Forbid("Only SuperAdmin can update subscription plans.");

        var userId = User.GetRequiredUserId();
        var result = await _subscriptionPlanService.UpdatePlanAsync(id, request, userId, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Delete a subscription plan (SuperAdmin only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlan(Guid id, CancellationToken cancellationToken)
    {
        if (!User.HasRole("SuperAdmin"))
            return Forbid("Only SuperAdmin can delete subscription plans.");

        var userId = User.GetRequiredUserId();
        var result = await _subscriptionPlanService.DeletePlanAsync(id, userId, cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }
}
