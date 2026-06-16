using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;

namespace AcademixLMS.Application.Interfaces;

public interface IPaymentService
{
    Task<Result<InitializePaymentResponse>> InitializeCoursePaymentAsync(Guid userId, Guid courseId, string? discountCode = null, Guid? sectionId = null, CancellationToken cancellationToken = default);
    Task<Result<InitializePaymentResponse>> InitializeSubscriptionPaymentAsync(Guid userId, Guid planId, string billingInterval, CancellationToken cancellationToken = default);
    /// <summary>When <paramref name="requestingUserId"/> is provided, payments owned by other users are reported as not found.</summary>
    Task<Result<PaymentDto>> VerifyPaymentAsync(string lahzaReference, Guid? requestingUserId = null, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<PaymentDto>>> GetPaymentsByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<PaymentListDto>>> GetAllPaymentsAsync(PagedRequest request, PaymentFilterRequest? filters = null, CancellationToken cancellationToken = default);
    Task<Result<PaymentSummaryDto>> GetPaymentSummaryAsync(CancellationToken cancellationToken = default);
    Task<Result<bool>> HasUserPaidForCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
}
