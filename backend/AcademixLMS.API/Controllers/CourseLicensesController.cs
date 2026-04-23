using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Organization;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/organizations/{orgId:guid}/licenses")]
[ApiVersion("1.0")]
[Tags("9. Organizations")]
[Authorize]
public class CourseLicensesController : ControllerBase
{
    private readonly ICourseLicenseService _licenseService;

    public CourseLicensesController(ICourseLicenseService licenseService)
    {
        _licenseService = licenseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetForOrg(Guid orgId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.GetLicensesForOrgAsync(orgId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{licenseId:guid}")]
    public async Task<IActionResult> GetById(Guid orgId, Guid licenseId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.GetByIdAsync(licenseId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    /// <summary>
    /// Purchase N seats of a course. In development this activates immediately; production flows
    /// through Lahza initialize → webhook → activate.
    /// </summary>
    [HttpPost("purchase")]
    public async Task<IActionResult> Purchase(Guid orgId, [FromBody] PurchaseLicenseRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.PurchaseAsync(orgId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{licenseId:guid}/activate")]
    public async Task<IActionResult> Activate(Guid orgId, Guid licenseId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.ActivateAsync(licenseId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{licenseId:guid}/assignments")]
    public async Task<IActionResult> GetAssignments(Guid orgId, Guid licenseId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.GetAssignmentsAsync(licenseId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{licenseId:guid}/assignments")]
    public async Task<IActionResult> Assign(Guid orgId, Guid licenseId, [FromBody] AssignLicenseRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.AssignSeatsAsync(licenseId, userId.Value, request, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpDelete("{licenseId:guid}/assignments/{enrollmentId:guid}")]
    public async Task<IActionResult> Revoke(Guid orgId, Guid licenseId, Guid enrollmentId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _licenseService.RevokeAssignmentAsync(licenseId, enrollmentId, userId.Value, cancellationToken);
        return result.IsSuccess ? NoContent() : BadRequest(result.Error);
    }
}
