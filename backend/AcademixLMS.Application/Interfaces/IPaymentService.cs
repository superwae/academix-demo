using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;

namespace AcademixLMS.Application.Interfaces;

public interface IPaymentService
{
    Task<Result<InitializePaymentResponse>> InitializeCoursePaymentAsync(Guid userId, Guid courseId, string? discountCode = null, CancellationToken cancellationToken = default);
    Task<Result<PaymentDto>> VerifyPaymentAsync(string lahzaReference, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<PaymentDto>>> GetPaymentsByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<PaymentListDto>>> GetAllPaymentsAsync(PagedRequest request, PaymentFilterRequest? filters = null, CancellationToken cancellationToken = default);
    Task<Result<PaymentSummaryDto>> GetPaymentSummaryAsync(CancellationToken cancellationToken = default);
    Task<Result<bool>> HasUserPaidForCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
}
