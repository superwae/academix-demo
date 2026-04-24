using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/teachers/earnings")]
[ApiVersion("1.0")]
[Tags("3. Courses")]
[Authorize(Policy = "RequireInstructor")]
public class TeacherEarningsController : ControllerBase
{
    private readonly ITeacherEarningsService _earningsService;

    public TeacherEarningsController(ITeacherEarningsService earningsService)
    {
        _earningsService = earningsService;
    }

    /// <summary>Earnings summary for the signed-in teacher for a given month (defaults to current).</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int? year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var result = await _earningsService.GetMonthlySummaryAsync(userId.Value, year, month, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
