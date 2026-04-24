using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Organization;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("9. Organizations")]
[Authorize]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _organizationService;

    public OrganizationsController(IOrganizationService organizationService)
    {
        _organizationService = organizationService;
    }

    /// <summary>Organizations the current user belongs to.</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.GetMyOrganizationsAsync(userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    /// <summary>All organizations (platform admin only).</summary>
    [HttpGet]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _organizationService.GetAllForAdminAsync(cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{orgId:guid}")]
    public async Task<IActionResult> GetById(Guid orgId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.GetByIdAsync(orgId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.GetBySlugAsync(slug, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.CreateAsync(userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPut("{orgId:guid}")]
    public async Task<IActionResult> Update(Guid orgId, [FromBody] UpdateOrganizationRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.UpdateAsync(orgId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    // ---- Members ----

    [HttpGet("{orgId:guid}/members")]
    public async Task<IActionResult> GetMembers(Guid orgId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.GetMembersAsync(orgId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{orgId:guid}/members/invite")]
    public async Task<IActionResult> InviteMember(Guid orgId, [FromBody] InviteMemberRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.InviteMemberAsync(orgId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{orgId:guid}/members/bulk")]
    public async Task<IActionResult> BulkInvite(Guid orgId, [FromBody] BulkInviteMembersRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.BulkInviteMembersAsync(orgId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPut("{orgId:guid}/members/{memberId:guid}/role")]
    public async Task<IActionResult> UpdateMemberRole(Guid orgId, Guid memberId, [FromBody] UpdateMemberRoleRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.UpdateMemberRoleAsync(orgId, memberId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpDelete("{orgId:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid orgId, Guid memberId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _organizationService.RemoveMemberAsync(orgId, memberId, userId.Value, cancellationToken);
        return result.IsSuccess ? NoContent() : BadRequest(result.Error);
    }

    // ---- Invite acceptance (public — token-based) ----

    [HttpGet("invites/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> PreviewInvite(string token, CancellationToken cancellationToken)
    {
        var result = await _organizationService.PreviewInviteAsync(token, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost("invites/accept")]
    [AllowAnonymous]
    public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteRequest request, CancellationToken cancellationToken)
    {
        var result = await _organizationService.AcceptInviteAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
