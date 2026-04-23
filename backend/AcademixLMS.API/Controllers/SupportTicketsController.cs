using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Support;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/support/tickets")]
[ApiVersion("1.0")]
[Tags("A. Support")]
[Authorize]
public class SupportTicketsController : ControllerBase
{
    private readonly ISupportTicketService _service;

    public SupportTicketsController(ISupportTicketService service)
    {
        _service = service;
    }

    private bool IsAdmin() =>
        User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

    /// <summary>Tickets opened by the current user.</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _service.GetMyTicketsAsync(userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    /// <summary>All tickets. Admin only.</summary>
    [HttpGet]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await _service.GetAllForAdminAsync(status, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    /// <summary>Ticket detail (owner or admin).</summary>
    [HttpGet("{ticketId:guid}")]
    public async Task<IActionResult> GetById(Guid ticketId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _service.GetByIdAsync(ticketId, userId.Value, IsAdmin(), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupportTicketRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _service.CreateAsync(userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{ticketId:guid}/replies")]
    public async Task<IActionResult> AddReply(Guid ticketId, [FromBody] CreateSupportTicketReplyRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _service.AddReplyAsync(ticketId, userId.Value, IsAdmin(), request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPatch("{ticketId:guid}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> Update(Guid ticketId, [FromBody] UpdateSupportTicketRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _service.UpdateAsync(ticketId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
