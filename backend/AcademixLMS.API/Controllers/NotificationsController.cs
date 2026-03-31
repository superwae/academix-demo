using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("Notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<NotificationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyNotifications([FromQuery] PagedRequest request, [FromQuery] bool? unreadOnly, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _notificationService.GetForUserAsync(userId, request, unreadOnly, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return Ok(result.Value);
    }

    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnreadCount([FromQuery] string? type, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _notificationService.GetUnreadCountAsync(userId, type, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return Ok(result.Value);
    }

    [HttpPut("read-by-type/{type}")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAsReadByType(string type, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _notificationService.MarkAsReadByTypeAsync(userId, type, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return Ok(result.Value);
    }

    [HttpPut("{id}/read")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _notificationService.MarkAsReadAsync(id, userId, cancellationToken);
        if (!result.IsSuccess)
            return NotFound(result.Error);
        return Ok();
    }

    [HttpPut("read-all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _notificationService.MarkAllAsReadAsync(userId, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return Ok();
    }
}
