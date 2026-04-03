using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Discount;

namespace AcademixLMS.Application.Interfaces;

public interface IDiscountService
{
    Task<Result<List<DiscountDto>>> GetDiscountsForCourseAsync(Guid courseId, Guid instructorId, CancellationToken cancellationToken = default);
    Task<Result<DiscountDto>> CreateDiscountAsync(CreateDiscountRequest request, Guid instructorId, CancellationToken cancellationToken = default);
    Task<Result<DiscountDto>> UpdateDiscountAsync(Guid id, UpdateDiscountRequest request, Guid instructorId, CancellationToken cancellationToken = default);
    Task<Result> DeleteDiscountAsync(Guid id, Guid instructorId, CancellationToken cancellationToken = default);
    Task<Result<ValidateDiscountResponse>> ValidateDiscountAsync(Guid courseId, string code, CancellationToken cancellationToken = default);
}
