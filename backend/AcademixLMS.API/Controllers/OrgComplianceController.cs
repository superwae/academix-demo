using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/organizations/{orgId:guid}/compliance")]
[ApiVersion("1.0")]
[Tags("9. Organizations")]
[Authorize]
public class OrgComplianceController : ControllerBase
{
    private readonly IOrgComplianceService _complianceService;

    public OrgComplianceController(IOrgComplianceService complianceService)
    {
        _complianceService = complianceService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(Guid orgId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _complianceService.GetSummaryAsync(orgId, userId.Value, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("assignments")]
    public async Task<IActionResult> GetAssignments(Guid orgId, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _complianceService.GetAssignmentsAsync(orgId, userId.Value, status, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
