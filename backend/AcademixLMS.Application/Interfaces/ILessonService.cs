using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Lesson;

namespace AcademixLMS.Application.Interfaces;

public interface ILessonService
{
    Task<Result<LessonDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<List<LessonDto>>> GetByCourseAsync(Guid courseId, CancellationToken cancellationToken = default);
    Task<Result<List<LessonDto>>> GetBySectionAsync(Guid sectionId, CancellationToken cancellationToken = default);
    Task<Result<LessonDto>> CreateAsync(CreateLessonRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<LessonDto>> UpdateAsync(Guid id, UpdateLessonRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    
    // Lesson Sections
    Task<Result<List<LessonSectionDto>>> GetCourseSectionsAsync(Guid courseId, CancellationToken cancellationToken = default);
    Task<Result<LessonSectionDto>> GetSectionByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<LessonSectionDto>> CreateSectionAsync(CreateLessonSectionRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<LessonSectionDto>> UpdateSectionAsync(Guid id, UpdateLessonSectionRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteSectionAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}


