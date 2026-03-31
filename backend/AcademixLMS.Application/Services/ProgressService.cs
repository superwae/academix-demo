using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Progress;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class ProgressService : IProgressService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<ProgressService> _logger;

    public ProgressService(
        IApplicationDbContext context,
        ILogger<ProgressService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<LessonProgressDto>> GetLessonProgressAsync(Guid userId, Guid lessonId, CancellationToken cancellationToken = default)
    {
        var progress = await _context.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == lessonId && !p.IsDeleted, cancellationToken);

        if (progress == null)
        {
            return Result<LessonProgressDto>.Failure("Progress not found.");
        }

        var dto = MapToLessonProgressDto(progress);
        return Result<LessonProgressDto>.Success(dto);
    }

    public async Task<Result<LessonProgressDto>> UpdateLessonProgressAsync(Guid userId, UpdateLessonProgressRequest request, CancellationToken cancellationToken = default)
    {
        // Verify lesson exists
        var lesson = await _context.Lessons
            .FirstOrDefaultAsync(l => l.Id == request.LessonId && !l.IsDeleted, cancellationToken);

        if (lesson == null)
        {
            return Result<LessonProgressDto>.Failure("Lesson not found.");
        }

        // Verify course matches
        if (lesson.CourseId != request.CourseId)
        {
            return Result<LessonProgressDto>.Failure("Course ID mismatch.");
        }

        // Get or create progress
        var progress = await _context.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == request.LessonId && !p.IsDeleted, cancellationToken);

        var now = DateTime.UtcNow;

        if (progress == null)
        {
            progress = new LessonProgress
            {
                UserId = userId,
                LessonId = request.LessonId,
                CourseId = request.CourseId,
                IsCompleted = request.IsCompleted,
                WatchedDurationSeconds = request.WatchedDurationSeconds,
                TotalDurationSeconds = request.TotalDurationSeconds,
                LastWatchedAt = now,
                CompletedAt = request.IsCompleted ? now : null,
            };
            _context.LessonProgresses.Add(progress);
        }
        else
        {
            progress.IsCompleted = request.IsCompleted;
            progress.WatchedDurationSeconds = request.WatchedDurationSeconds;
            progress.TotalDurationSeconds = request.TotalDurationSeconds;
            progress.LastWatchedAt = now;
            
            if (request.IsCompleted && progress.CompletedAt == null)
            {
                progress.CompletedAt = now;
            }
            else if (!request.IsCompleted)
            {
                progress.CompletedAt = null;
            }
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            
            // Update enrollment progress percentage
            await UpdateEnrollmentProgressAsync(userId, request.CourseId, cancellationToken);
            
            var dto = MapToLessonProgressDto(progress);
            return Result<LessonProgressDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating lesson progress for user {UserId}, lesson {LessonId}", userId, request.LessonId);
            return Result<LessonProgressDto>.Failure("Failed to update progress.");
        }
    }

    public async Task<Result<LessonProgressDto>> MarkLessonCompletedAsync(Guid userId, MarkLessonCompletedRequest request, CancellationToken cancellationToken = default)
    {
        var updateRequest = new UpdateLessonProgressRequest
        {
            LessonId = request.LessonId,
            CourseId = request.CourseId,
            WatchedDurationSeconds = request.TotalDurationSeconds,
            TotalDurationSeconds = request.TotalDurationSeconds,
            IsCompleted = true
        };

        return await UpdateLessonProgressAsync(userId, updateRequest, cancellationToken);
    }

    public async Task<Result<CourseProgressDto>> GetCourseProgressAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        // Get total lessons for the course
        var totalLessons = await _context.Lessons
            .CountAsync(l => l.CourseId == courseId && !l.IsDeleted, cancellationToken);

        if (totalLessons == 0)
        {
            return Result<CourseProgressDto>.Success(new CourseProgressDto
            {
                CourseId = courseId,
                TotalLessons = 0,
                CompletedLessons = 0,
                ProgressPercentage = 0,
                LastAccessedAt = null
            });
        }

        // Get user's progress for all lessons in the course
        var progresses = await _context.LessonProgresses
            .Where(p => p.UserId == userId && p.CourseId == courseId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var completedLessons = progresses.Count(p => p.IsCompleted);
        var progressPercentage = totalLessons > 0 
            ? Math.Round((decimal)completedLessons / totalLessons * 100, 2) 
            : 0;

        var lastAccessed = progresses
            .OrderByDescending(p => p.LastWatchedAt)
            .FirstOrDefault()?.LastWatchedAt;

        var dto = new CourseProgressDto
        {
            CourseId = courseId,
            TotalLessons = totalLessons,
            CompletedLessons = completedLessons,
            ProgressPercentage = progressPercentage,
            LastAccessedAt = lastAccessed
        };

        return Result<CourseProgressDto>.Success(dto);
    }

    public async Task<Result<List<LessonProgressDto>>> GetCourseLessonsProgressAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var progresses = await _context.LessonProgresses
            .Where(p => p.UserId == userId && p.CourseId == courseId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var dtos = progresses.Select(MapToLessonProgressDto).ToList();
        return Result<List<LessonProgressDto>>.Success(dtos);
    }

    public async Task<Result<LessonProgressDto?>> GetContinueWatchingAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var progress = await _context.LessonProgresses
            .Where(p => p.UserId == userId && p.CourseId == courseId && !p.IsCompleted && !p.IsDeleted)
            .OrderByDescending(p => p.LastWatchedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (progress == null)
        {
            return Result<LessonProgressDto?>.Success(null);
        }

        var dto = MapToLessonProgressDto(progress);
        return Result<LessonProgressDto?>.Success(dto);
    }

    private async Task UpdateEnrollmentProgressAsync(Guid userId, Guid courseId, CancellationToken cancellationToken)
    {
        // Get active enrollment for this user and course
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId && 
                e.Status == Domain.Common.EnrollmentStatus.Active && !e.IsDeleted, cancellationToken);

        if (enrollment == null)
        {
            return; // No active enrollment, skip
        }

        // Calculate progress percentage based on completed lessons
        var totalLessons = await _context.Lessons
            .CountAsync(l => l.CourseId == courseId && !l.IsDeleted, cancellationToken);

        if (totalLessons == 0)
        {
            enrollment.ProgressPercentage = 0;
        }
        else
        {
            var completedLessons = await _context.LessonProgresses
                .CountAsync(p => p.UserId == userId && p.CourseId == courseId && 
                    p.IsCompleted && !p.IsDeleted, cancellationToken);

            enrollment.ProgressPercentage = Math.Round((decimal)completedLessons / totalLessons * 100, 2);
        }

        // Mark enrollment as completed if all lessons are done
        if (enrollment.ProgressPercentage >= 100 && enrollment.CompletedAt == null)
        {
            enrollment.CompletedAt = DateTime.UtcNow;
            enrollment.Status = Domain.Common.EnrollmentStatus.Completed;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static LessonProgressDto MapToLessonProgressDto(LessonProgress progress)
    {
        return new LessonProgressDto
        {
            Id = progress.Id,
            LessonId = progress.LessonId,
            CourseId = progress.CourseId,
            IsCompleted = progress.IsCompleted,
            WatchedDurationSeconds = progress.WatchedDurationSeconds,
            TotalDurationSeconds = progress.TotalDurationSeconds,
            LastWatchedAt = progress.LastWatchedAt,
            CompletedAt = progress.CompletedAt
        };
    }
}


