using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;

namespace AcademixLMS.Application.Interfaces;

public interface ICourseService
{
    Task<Result<CourseDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<CourseDto>>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<CourseDto>>> GetByCategoryAsync(string category, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<CourseDto>>> GetByInstructorAsync(Guid instructorId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<List<CourseDto>>> GetFeaturedAsync(CancellationToken cancellationToken = default);
    Task<Result<CourseDto>> CreateAsync(CreateCourseRequest request, CancellationToken cancellationToken = default);
    Task<Result<CourseDto>> UpdateAsync(Guid id, UpdateCourseRequest request, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result> PublishAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result> ArchiveAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<CourseSectionDto>> AddSectionAsync(Guid courseId, CreateSectionRequest request, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default);
    Task<Result> UpdateSectionAsync(Guid courseId, Guid sectionId, CreateSectionRequest request, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default);
    Task<Result> DeleteSectionAsync(Guid courseId, Guid sectionId, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default);
}


