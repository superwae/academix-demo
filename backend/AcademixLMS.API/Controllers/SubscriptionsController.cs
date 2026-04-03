using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Subscription;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("Subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly ILogger<SubscriptionsController> _logger;

    public SubscriptionsController(ISubscriptionService subscriptionService, ILogger<SubscriptionsController> logger)
    {
        _subscriptionService = subscriptionService;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's active subscription
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(SubscriptionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMySubscription(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _subscriptionService.GetSubscriptionByUserIdAsync(userId, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Check if user can create another course (based on subscription limits)
    /// </summary>
    [HttpGet("me/can-create-course")]
    [ProducesResponseType(typeof(SubscriptionStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CanCreateCourse(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _subscriptionService.GetSubscriptionStatusAsync(userId, cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Subscribe to a plan
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(SubscriptionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Subscribe([FromBody] CreateSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _subscriptionService.SubscribeAsync(userId, request.PlanId, request.BillingInterval, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetMySubscription), result.Value);
    }

    /// <summary>
    /// Cancel current subscription
    /// </summary>
    [HttpDelete("me")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelSubscription(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();

        // Get the active subscription first to get its ID
        var subResult = await _subscriptionService.GetSubscriptionByUserIdAsync(userId, cancellationToken);
        if (!subResult.IsSuccess || subResult.Value == null)
            return NotFound("No active subscription found.");

        var result = await _subscriptionService.CancelSubscriptionAsync(subResult.Value.Id, userId, cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        return NoContent();
    }
}

/// <summary>
/// Request body for subscribing to a plan
/// </summary>
public class CreateSubscriptionRequest
{
    public Guid PlanId { get; set; }
    public BillingInterval BillingInterval { get; set; }
}
