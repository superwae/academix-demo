using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;

namespace AcademixLMS.Application.Interfaces;

public interface ICourseLicenseService
{
    Task<Result<IReadOnlyList<CourseLicenseDto>>> GetLicensesForOrgAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<Result<CourseLicenseDto>> GetByIdAsync(Guid licenseId, Guid requestingUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a license + corresponding Payment record. In production this returns a pending
    /// license that is activated via the Lahza webhook. In development we activate immediately
    /// so the demo can exercise the assignment flow.
    /// </summary>
    Task<Result<CourseLicenseDto>> PurchaseAsync(Guid orgId, Guid requestingUserId, PurchaseLicenseRequest request, CancellationToken cancellationToken = default);

    Task<Result<CourseLicenseDto>> ActivateAsync(Guid licenseId, Guid requestingUserId, CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<LicenseAssignmentDto>>> GetAssignmentsAsync(Guid licenseId, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<LicenseAssignmentDto>>> AssignSeatsAsync(Guid licenseId, Guid requestingUserId, AssignLicenseRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> RevokeAssignmentAsync(Guid licenseId, Guid enrollmentId, Guid requestingUserId, CancellationToken cancellationToken = default);
}
