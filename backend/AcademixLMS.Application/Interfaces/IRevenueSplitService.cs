using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;

namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Resolves how a single course sale is split between the platform, the owning organization
/// (if any), and the instructor. Resolution precedence:
///
/// - Platform cut:
///   (1) Owning Organization.PlatformFeePercent if the course is under a Teaching Institution
///   (2) Instructor.PlatformFeePercentOverride if set (SuperAdmin-managed per-user discount)
///   (3) Payments:PlatformFeePercent from config
/// - Organization cut: Organization.OrgFeePercent, or 0 for independent instructors
/// - Instructor cut: the remainder (100 - platform - org), never negative
///
/// A part with 0% is omitted from the preview but kept at 0 in persisted amounts so the math
/// always reconciles.
/// </summary>
public interface IRevenueSplitService
{
    /// <summary>Preview the split for a given course at a hypothetical price (used on the course form).</summary>
    Task<Result<RevenueSplitPreviewDto>> PreviewForCourseAsync(Guid courseId, decimal? priceOverride, CancellationToken cancellationToken = default);

    /// <summary>Preview the split for a (price, instructor, org) tuple — used when the course hasn't been persisted yet.</summary>
    Task<Result<RevenueSplitPreviewDto>> PreviewForInstructorAsync(Guid? instructorUserId, Guid? organizationId, decimal price, CancellationToken cancellationToken = default);

    /// <summary>Compute the split for a completed payment and return raw amounts in the smallest currency unit.</summary>
    Task<Result<(long PlatformAmount, long OrgAmount, long InstructorAmount)>> ComputeForPaymentAsync(Guid courseId, long amount, CancellationToken cancellationToken = default);
}
