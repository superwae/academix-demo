using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;

namespace AcademixLMS.Application.Interfaces;

public interface IOrgComplianceService
{
    Task<Result<OrgComplianceSummaryDto>> GetSummaryAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<OrgAssignmentRowDto>>> GetAssignmentsAsync(Guid orgId, Guid requestingUserId, string? statusFilter, CancellationToken cancellationToken = default);
}
