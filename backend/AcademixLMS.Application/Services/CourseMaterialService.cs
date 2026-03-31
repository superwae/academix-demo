using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class CourseMaterialService : ICourseMaterialService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CourseMaterialService> _logger;

    public CourseMaterialService(IApplicationDbContext context, ILogger<CourseMaterialService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<CourseMaterialDto>>> GetForCourseAsync(
        Guid courseId,
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        if (!await CanViewCourseMaterialsAsync(courseId, userId, isAdmin, cancellationToken))
            return Result<List<CourseMaterialDto>>.Failure("You do not have access to this course materials.");

        var list = await _context.CourseMaterials
            .AsNoTracking()
            .Include(m => m.Lesson)
            .Where(m => m.CourseId == courseId && !m.IsDeleted)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Title)
            .Select(m => new CourseMaterialDto
            {
                Id = m.Id,
                CourseId = m.CourseId,
                LessonId = m.LessonId,
                LessonTitle = m.Lesson != null ? m.Lesson.Title : null,
                Title = m.Title,
                FileUrl = m.FileUrl,
                FileName = m.FileName,
                FileSizeBytes = m.FileSizeBytes,
                SortOrder = m.SortOrder,
                Kind = m.Kind
            })
            .ToListAsync(cancellationToken);

        return Result<List<CourseMaterialDto>>.Success(list);
    }

    public async Task<Result<CourseMaterialDto>> CreateAsync(
        CreateCourseMaterialRequest request,
        Guid instructorId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);
        if (course == null)
            return Result<CourseMaterialDto>.Failure("Course not found.");

        if (!isAdmin && course.InstructorId != instructorId)
            return Result<CourseMaterialDto>.Failure("Only the course instructor can add materials.");

        if (request.LessonId.HasValue)
        {
            var lessonOk = await _context.Lessons.AnyAsync(
                l => l.Id == request.LessonId && l.CourseId == request.CourseId && !l.IsDeleted,
                cancellationToken);
            if (!lessonOk)
                return Result<CourseMaterialDto>.Failure("Lesson does not belong to this course.");
        }

        var entity = new CourseMaterial
        {
            CourseId = request.CourseId,
            LessonId = request.LessonId,
            Title = request.Title.Trim(),
            FileUrl = request.FileUrl.Trim(),
            FileName = request.FileName?.Trim(),
            FileSizeBytes = request.FileSizeBytes,
            SortOrder = request.SortOrder,
            Kind = request.Kind
        };

        _context.CourseMaterials.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = await _context.CourseMaterials
            .AsNoTracking()
            .Include(m => m.Lesson)
            .Where(m => m.Id == entity.Id)
            .Select(m => new CourseMaterialDto
            {
                Id = m.Id,
                CourseId = m.CourseId,
                LessonId = m.LessonId,
                LessonTitle = m.Lesson != null ? m.Lesson.Title : null,
                Title = m.Title,
                FileUrl = m.FileUrl,
                FileName = m.FileName,
                FileSizeBytes = m.FileSizeBytes,
                SortOrder = m.SortOrder,
                Kind = m.Kind
            })
            .FirstAsync(cancellationToken);

        return Result<CourseMaterialDto>.Success(dto);
    }

    public async Task<Result> DeleteAsync(Guid materialId, Guid userId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var material = await _context.CourseMaterials
            .Include(m => m.Course)
            .FirstOrDefaultAsync(m => m.Id == materialId && !m.IsDeleted, cancellationToken);
        if (material == null)
            return Result.Failure("Material not found.");

        if (!isAdmin && material.Course.InstructorId != userId)
            return Result.Failure("Only the course instructor can remove materials.");

        material.IsDeleted = true;
        material.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private async Task<bool> CanViewCourseMaterialsAsync(Guid courseId, Guid userId, bool isAdmin, CancellationToken ct)
    {
        if (isAdmin)
            return true;

        var course = await _context.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, ct);
        if (course == null)
            return false;
        if (course.InstructorId == userId)
            return true;

        return await _context.Enrollments.AnyAsync(
            e => e.UserId == userId && e.CourseId == courseId && !e.IsDeleted
                 && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
            ct);
    }
}
