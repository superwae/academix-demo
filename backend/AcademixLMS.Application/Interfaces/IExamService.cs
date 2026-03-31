using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Exam;

namespace AcademixLMS.Application.Interfaces;

public interface IExamService
{
    Task<Result<ExamDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<ExamDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<ExamDto>> CreateAsync(CreateExamRequest request, CancellationToken cancellationToken = default);
    Task<Result<ExamDto>> UpdateAsync(Guid id, CreateExamRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<StartExamResponse>> StartExamAsync(StartExamRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<ExamAttemptDto>> SubmitExamAsync(SubmitExamRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<ExamAttemptDto>> GetAttemptAsync(Guid attemptId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<ExamResultDto>> GetExamResultAsync(Guid attemptId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<ExamAttemptDto>>> GetAttemptsByExamAsync(Guid examId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<ExamAttemptDto>>> GetAttemptsByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<ExamAttemptDto>> UpdateAttemptScoreAsync(Guid attemptId, Guid instructorId, UpdateAttemptScoreRequest request, CancellationToken cancellationToken = default);
    Task<Result<ExamAttemptDto>> PublishAttemptScoreAsync(Guid attemptId, Guid instructorId, CancellationToken cancellationToken = default);
    /// <summary>Instructor-only: get full submission (questions + answers) for grading.</summary>
    Task<Result<ExamResultDto>> GetAttemptSubmissionForInstructorAsync(Guid attemptId, Guid instructorId, CancellationToken cancellationToken = default);
}


