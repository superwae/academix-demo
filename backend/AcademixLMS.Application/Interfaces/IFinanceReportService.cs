using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Finance;

namespace AcademixLMS.Application.Interfaces;

public interface IFinanceReportService
{
    Task<Result<FinanceOverviewDto>> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task<Result<PagedResult<FinancePayoutDto>>> GetPayoutsAsync(PagedRequest request, string? status = null, CancellationToken cancellationToken = default);
    Task<Result<FinancePayoutSummaryDto>> GetPayoutSummaryAsync(CancellationToken cancellationToken = default);
    Task<Result<PagedResult<FinanceInvoiceDto>>> GetInvoicesAsync(PagedRequest request, string? status = null, CancellationToken cancellationToken = default);
    Task<Result<FinanceInvoiceSummaryDto>> GetInvoiceSummaryAsync(CancellationToken cancellationToken = default);
}
