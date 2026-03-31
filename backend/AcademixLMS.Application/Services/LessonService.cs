using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Lesson;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class LessonService : ILessonService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<LessonService> _logger;

    public LessonService(
        IApplicationDbContext context,
        ILogger<LessonService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<LessonDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var lesson = await _context.Lessons
            .Include(l => l.Course)
            .Include(l => l.Section)
            .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, cancellationToken);

        if (lesson == null)
        {
            return Result<LessonDto>.Failure("Lesson not found.");
        }

        var dto = MapToLessonDto(lesson);
        return Result<LessonDto>.Success(dto);
    }

    public async Task<Result<List<LessonDto>>> GetByCourseAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var lessons = await _context.Lessons
            .Include(l => l.Section)
            .Where(l => l.CourseId == courseId && !l.IsDeleted)
            .OrderBy(l => l.Order)
            .ToListAsync(cancellationToken);

        var dtos = lessons.Select(MapToLessonDto).ToList();
        return Result<List<LessonDto>>.Success(dtos);
    }

    public async Task<Result<List<LessonDto>>> GetBySectionAsync(Guid sectionId, CancellationToken cancellationToken = default)
    {
        var lessons = await _context.Lessons
            .Include(l => l.Section)
            .Where(l => l.SectionId == sectionId && !l.IsDeleted)
            .OrderBy(l => l.Order)
            .ToListAsync(cancellationToken);

        var dtos = lessons.Select(MapToLessonDto).ToList();
        return Result<List<LessonDto>>.Success(dtos);
    }

    public async Task<Result<LessonDto>> CreateAsync(CreateLessonRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Verify course exists
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<LessonDto>.Failure("Course not found.");
        }

        // Verify section exists if provided
        if (request.SectionId.HasValue)
        {
            var section = await _context.LessonSections
                .FirstOrDefaultAsync(s => s.Id == request.SectionId.Value && s.CourseId == request.CourseId && !s.IsDeleted, cancellationToken);

            if (section == null)
            {
                return Result<LessonDto>.Failure("Lesson section not found or does not belong to this course.");
            }
        }

        var lesson = new Lesson
        {
            CourseId = request.CourseId,
            SectionId = request.SectionId,
            Title = request.Title,
            Description = request.Description,
            VideoUrl = request.VideoUrl,
            DurationMinutes = request.DurationMinutes,
            Order = request.Order,
            IsPreview = request.IsPreview,
            CreatedBy = userId,
        };

        _context.Lessons.Add(lesson);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            var dto = MapToLessonDto(lesson);
            return Result<LessonDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating lesson for course {CourseId}", request.CourseId);
            return Result<LessonDto>.Failure("Failed to create lesson.");
        }
    }

    public async Task<Result<LessonDto>> UpdateAsync(Guid id, UpdateLessonRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var lesson = await _context.Lessons
            .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, cancellationToken);

        if (lesson == null)
        {
            return Result<LessonDto>.Failure("Lesson not found.");
        }

        // Verify section if provided
        if (request.SectionId.HasValue && request.SectionId.Value != lesson.SectionId)
        {
            var section = await _context.LessonSections
                .FirstOrDefaultAsync(s => s.Id == request.SectionId.Value && s.CourseId == lesson.CourseId && !s.IsDeleted, cancellationToken);

            if (section == null)
            {
                return Result<LessonDto>.Failure("Lesson section not found or does not belong to this course.");
            }
        }

        // Update properties
        if (request.Title != null) lesson.Title = request.Title;
        if (request.Description != null) lesson.Description = request.Description;
        if (request.VideoUrl != null) lesson.VideoUrl = request.VideoUrl;
        if (request.DurationMinutes.HasValue) lesson.DurationMinutes = request.DurationMinutes;
        if (request.Order.HasValue) lesson.Order = request.Order.Value;
        if (request.IsPreview.HasValue) lesson.IsPreview = request.IsPreview.Value;
        if (request.SectionId.HasValue) lesson.SectionId = request.SectionId;

        lesson.UpdatedBy = userId;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            var dto = MapToLessonDto(lesson);
            return Result<LessonDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating lesson {LessonId}", id);
            return Result<LessonDto>.Failure("Failed to update lesson.");
        }
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var lesson = await _context.Lessons
            .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, cancellationToken);

        if (lesson == null)
        {
            return Result<bool>.Failure("Lesson not found.");
        }

        lesson.IsDeleted = true;
        lesson.DeletedAt = DateTime.UtcNow;
        lesson.DeletedBy = userId;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting lesson {LessonId}", id);
            return Result<bool>.Failure("Failed to delete lesson.");
        }
    }

    public async Task<Result<List<LessonSectionDto>>> GetCourseSectionsAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var sections = await _context.LessonSections
            .Where(s => s.CourseId == courseId && !s.IsDeleted)
            .OrderBy(s => s.Order)
            .ToListAsync(cancellationToken);

        var dtos = sections.Select(MapToSectionDto).ToList();
        return Result<List<LessonSectionDto>>.Success(dtos);
    }

    public async Task<Result<LessonSectionDto>> GetSectionByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var section = await _context.LessonSections
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken);

        if (section == null)
        {
            return Result<LessonSectionDto>.Failure("Lesson section not found.");
        }

        var dto = MapToSectionDto(section);
        return Result<LessonSectionDto>.Success(dto);
    }

    public async Task<Result<LessonSectionDto>> CreateSectionAsync(CreateLessonSectionRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Verify course exists
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<LessonSectionDto>.Failure("Course not found.");
        }

        var section = new LessonSection
        {
            CourseId = request.CourseId,
            Title = request.Title,
            Description = request.Description,
            Order = request.Order,
            CreatedBy = userId,
        };

        _context.LessonSections.Add(section);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            var dto = MapToSectionDto(section);
            return Result<LessonSectionDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating lesson section for course {CourseId}", request.CourseId);
            return Result<LessonSectionDto>.Failure("Failed to create lesson section.");
        }
    }

    public async Task<Result<LessonSectionDto>> UpdateSectionAsync(Guid id, UpdateLessonSectionRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var section = await _context.LessonSections
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken);

        if (section == null)
        {
            return Result<LessonSectionDto>.Failure("Lesson section not found.");
        }

        if (request.Title != null) section.Title = request.Title;
        if (request.Description != null) section.Description = request.Description;
        if (request.Order.HasValue) section.Order = request.Order.Value;

        section.UpdatedBy = userId;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            var dto = MapToSectionDto(section);
            return Result<LessonSectionDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating lesson section {SectionId}", id);
            return Result<LessonSectionDto>.Failure("Failed to update lesson section.");
        }
    }

    public async Task<Result<bool>> DeleteSectionAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var section = await _context.LessonSections
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken);

        if (section == null)
        {
            return Result<bool>.Failure("Lesson section not found.");
        }

        section.IsDeleted = true;
        section.DeletedAt = DateTime.UtcNow;
        section.DeletedBy = userId;

        // Note: Lessons in this section will have SectionId set to null (due to DeleteBehavior.SetNull)

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting lesson section {SectionId}", id);
            return Result<bool>.Failure("Failed to delete lesson section.");
        }
    }

    private static LessonDto MapToLessonDto(Lesson lesson)
    {
        return new LessonDto
        {
            Id = lesson.Id,
            CourseId = lesson.CourseId,
            SectionId = lesson.SectionId,
            Title = lesson.Title,
            Description = lesson.Description,
            VideoUrl = lesson.VideoUrl,
            DurationMinutes = lesson.DurationMinutes,
            Order = lesson.Order,
            IsPreview = lesson.IsPreview,
        };
    }

    private static LessonSectionDto MapToSectionDto(LessonSection section)
    {
        return new LessonSectionDto
        {
            Id = section.Id,
            CourseId = section.CourseId,
            Title = section.Title,
            Description = section.Description,
            Order = section.Order,
        };
    }
}


