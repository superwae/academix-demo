using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Finance;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/finance")]
[ApiVersion("1.0")]
[Authorize(Policy = "RequireFinance")]
[Tags("Finance")]
public class FinanceController : ControllerBase
{
    private readonly IFinanceReportService _financeReportService;

    public FinanceController(IFinanceReportService financeReportService)
    {
        _financeReportService = financeReportService;
    }

    [HttpGet("overview")]
    [ProducesResponseType(typeof(FinanceOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var result = await _financeReportService.GetOverviewAsync(cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("payouts")]
    [ProducesResponseType(typeof(PagedResult<FinancePayoutDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPayouts([FromQuery] PagedRequest request, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await _financeReportService.GetPayoutsAsync(request, status, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("payouts/summary")]
    [ProducesResponseType(typeof(FinancePayoutSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPayoutSummary(CancellationToken cancellationToken)
    {
        var result = await _financeReportService.GetPayoutSummaryAsync(cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("invoices")]
    [ProducesResponseType(typeof(PagedResult<FinanceInvoiceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvoices([FromQuery] PagedRequest request, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await _financeReportService.GetInvoicesAsync(request, status, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("invoices/summary")]
    [ProducesResponseType(typeof(FinanceInvoiceSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvoiceSummary(CancellationToken cancellationToken)
    {
        var result = await _financeReportService.GetInvoiceSummaryAsync(cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
