using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Review;

namespace AcademixLMS.Application.Interfaces;

public interface IReviewService
{
    Task<Result<ReviewDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<ReviewDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, bool includeHidden = false, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<ReviewDto>>> GetByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<ReviewDto>> CreateAsync(CreateReviewRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<ReviewDto>> UpdateAsync(Guid id, UpdateReviewRequest request, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid id, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default);
    Task<Result<ReviewDto?>> GetUserReviewForCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
}






















