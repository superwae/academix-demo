using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class LessonRatingService : ILessonRatingService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<LessonRatingService> _logger;

    public LessonRatingService(IApplicationDbContext context, ILogger<LessonRatingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<LessonRatingSummaryDto>>> GetSummariesForCourseAsync(
        Guid courseId,
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        if (!await CanAccessCourseRatingsAsync(courseId, userId, isAdmin, cancellationToken))
            return Result<List<LessonRatingSummaryDto>>.Failure("You do not have access to ratings for this course.");

        var lessons = await _context.Lessons
            .AsNoTracking()
            .Where(l => l.CourseId == courseId && !l.IsDeleted)
            .OrderBy(l => l.Order)
            .ThenBy(l => l.Title)
            .Select(l => new { l.Id, l.Title })
            .ToListAsync(cancellationToken);

        var lessonIds = lessons.Select(l => l.Id).ToList();
        var aggregates = await _context.LessonRatings
            .AsNoTracking()
            .Where(r => lessonIds.Contains(r.LessonId) && !r.IsDeleted)
            .GroupBy(r => r.LessonId)
            .Select(g => new
            {
                LessonId = g.Key,
                Avg = g.Average(x => (double)x.Rating),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var myRatings = await _context.LessonRatings
            .AsNoTracking()
            .Where(r => r.UserId == userId && lessonIds.Contains(r.LessonId) && !r.IsDeleted)
            .Select(r => new { r.LessonId, r.Rating })
            .ToListAsync(cancellationToken);
        var myMap = myRatings.ToDictionary(x => x.LessonId, x => x.Rating);

        var aggMap = aggregates.ToDictionary(x => x.LessonId);

        var list = lessons.Select(l =>
        {
            aggMap.TryGetValue(l.Id, out var agg);
            myMap.TryGetValue(l.Id, out var mine);
            return new LessonRatingSummaryDto
            {
                LessonId = l.Id,
                LessonTitle = l.Title,
                AverageRating = agg != null ? Math.Round(agg.Avg, 2) : 0,
                RatingCount = agg?.Count ?? 0,
                MyRating = mine > 0 ? mine : null
            };
        }).ToList();

        return Result<List<LessonRatingSummaryDto>>.Success(list);
    }

    public async Task<Result<LessonRatingSummaryDto>> UpsertAsync(
        Guid courseId,
        Guid lessonId,
        UpsertLessonRatingRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (request.Rating is < 1 or > 5)
            return Result<LessonRatingSummaryDto>.Failure("Rating must be between 1 and 5.");

        var lesson = await _context.Lessons
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.CourseId == courseId && !l.IsDeleted, cancellationToken);
        if (lesson == null)
            return Result<LessonRatingSummaryDto>.Failure("Lesson not found.");

        var enrolled = await _context.Enrollments.AnyAsync(
            e => e.UserId == userId && e.CourseId == lesson.CourseId && !e.IsDeleted
                 && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
            cancellationToken);
        if (!enrolled)
            return Result<LessonRatingSummaryDto>.Failure("You must be enrolled in this course to rate a lesson.");

        var existing = await _context.LessonRatings
            .FirstOrDefaultAsync(r => r.LessonId == lessonId && r.UserId == userId && !r.IsDeleted, cancellationToken);

        if (existing != null)
        {
            existing.Rating = request.Rating;
            existing.Comment = request.Comment?.Trim();
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.LessonRatings.Add(new LessonRating
            {
                UserId = userId,
                LessonId = lessonId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim()
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var ratingQuery = _context.LessonRatings.AsNoTracking()
            .Where(r => r.LessonId == lessonId && !r.IsDeleted);
        var count = await ratingQuery.CountAsync(cancellationToken);
        var avg = count > 0
            ? await ratingQuery.AverageAsync(r => (double)r.Rating, cancellationToken)
            : (double)request.Rating;

        return Result<LessonRatingSummaryDto>.Success(new LessonRatingSummaryDto
        {
            LessonId = lessonId,
            LessonTitle = lesson.Title,
            AverageRating = Math.Round(avg, 2),
            RatingCount = count,
            MyRating = request.Rating
        });
    }

    private async Task<bool> CanAccessCourseRatingsAsync(Guid courseId, Guid userId, bool isAdmin, CancellationToken ct)
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
