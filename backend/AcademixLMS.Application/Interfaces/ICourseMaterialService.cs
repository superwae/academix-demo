using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;

namespace AcademixLMS.Application.Interfaces;

public interface ICourseMaterialService
{
    Task<Result<List<CourseMaterialDto>>> GetForCourseAsync(Guid courseId, Guid userId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<Result<CourseMaterialDto>> CreateAsync(CreateCourseMaterialRequest request, Guid instructorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(Guid materialId, Guid userId, bool isAdmin, CancellationToken cancellationToken = default);
}
