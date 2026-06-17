using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Audit;

namespace AcademixLMS.Application.Interfaces;

public interface IAuditLogService
{
    Task RecordAsync(AuditLogCreateDto request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<AuditLogDto>>> GetPagedAsync(PagedRequest request, AuditLogFilterRequest? filters = null, CancellationToken cancellationToken = default);
    Task<Result<AuditLogSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken = default);
}
