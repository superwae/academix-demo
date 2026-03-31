using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Progress;

namespace AcademixLMS.Application.Interfaces;

public interface IProgressService
{
    Task<Result<LessonProgressDto>> GetLessonProgressAsync(Guid userId, Guid lessonId, CancellationToken cancellationToken = default);
    Task<Result<LessonProgressDto>> UpdateLessonProgressAsync(Guid userId, UpdateLessonProgressRequest request, CancellationToken cancellationToken = default);
    Task<Result<LessonProgressDto>> MarkLessonCompletedAsync(Guid userId, MarkLessonCompletedRequest request, CancellationToken cancellationToken = default);
    Task<Result<CourseProgressDto>> GetCourseProgressAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
    Task<Result<List<LessonProgressDto>>> GetCourseLessonsProgressAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
    Task<Result<LessonProgressDto?>> GetContinueWatchingAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default);
}


