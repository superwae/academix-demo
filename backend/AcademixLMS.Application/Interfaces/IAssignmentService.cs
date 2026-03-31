using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Assignment;

namespace AcademixLMS.Application.Interfaces;

public interface  IAssignmentService
{
    Task<Result<AssignmentDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<AssignmentDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<AssignmentDto>>> GetByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<AssignmentDto>> CreateAsync(CreateAssignmentRequest request, CancellationToken cancellationToken = default);
    Task<Result<AssignmentDto>> UpdateAsync(Guid id, UpdateAssignmentRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<AssignmentSubmissionDto>> GetSubmissionAsync(Guid assignmentId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<AssignmentSubmissionDto>> SubmitAsync(Guid assignmentId, SubmitAssignmentRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<AssignmentSubmissionDto>> GradeSubmissionAsync(Guid submissionId, GradeSubmissionRequest request, Guid gradedBy, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<AssignmentSubmissionDto>>> GetSubmissionsAsync(Guid assignmentId, PagedRequest request, CancellationToken cancellationToken = default);
}


