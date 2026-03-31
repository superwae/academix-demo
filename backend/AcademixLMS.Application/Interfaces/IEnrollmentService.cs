using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Enrollment;

namespace AcademixLMS.Application.Interfaces;

public interface IEnrollmentService
{
    Task<Result<EnrollmentDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<EnrollmentDto>>> GetByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<EnrollmentDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<EnrollmentDto>> EnrollAsync(CreateEnrollmentRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result> UnenrollAsync(Guid enrollmentId, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default);
    Task<Result<EnrollmentDto>> UpdateAsync(Guid id, UpdateEnrollmentRequest request, CancellationToken cancellationToken = default);
    Task<Result> UpdateProgressAsync(Guid enrollmentId, decimal progressPercentage, CancellationToken cancellationToken = default);
    Task<Result> CompleteAsync(Guid enrollmentId, CancellationToken cancellationToken = default);
    Task<Result<bool>> CheckConflictAsync(Guid userId, Guid courseId, Guid sectionId, CancellationToken cancellationToken = default);
    Task<Result<bool>> VerifyCourseInstructorAsync(Guid courseId, Guid userId, CancellationToken cancellationToken = default);
}


