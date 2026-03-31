using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;

namespace AcademixLMS.Application.Interfaces;

public interface ILessonRatingService
{
    Task<Result<List<LessonRatingSummaryDto>>> GetSummariesForCourseAsync(Guid courseId, Guid userId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<Result<LessonRatingSummaryDto>> UpsertAsync(Guid courseId, Guid lessonId, UpsertLessonRatingRequest request, Guid userId, CancellationToken cancellationToken = default);
}
