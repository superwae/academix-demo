using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class MeetingTimeRatingService : IMeetingTimeRatingService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<MeetingTimeRatingService> _logger;

    public MeetingTimeRatingService(IApplicationDbContext context, ILogger<MeetingTimeRatingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<MeetingTimeRatingSummaryDto>>> GetSummariesForCourseAsync(
        Guid courseId,
        Guid userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        if (!await CanAccessCourseRatingsAsync(courseId, userId, isAdmin, cancellationToken))
            return Result<List<MeetingTimeRatingSummaryDto>>.Failure("You do not have access to ratings for this course.");

        var meetingRows = await _context.SectionMeetingTimes
            .AsNoTracking()
            .Include(m => m.Section)
            .Where(m => m.Section.CourseId == courseId && !m.IsDeleted && !m.Section.IsDeleted)
            .Select(m => new
            {
                m.Id,
                m.SectionId,
                SectionName = m.Section.Name,
                m.Day,
                m.StartMinutes,
                m.EndMinutes
            })
            .ToListAsync(cancellationToken);

        var ids = meetingRows.Select(m => m.Id).ToList();
        var aggregates = await _context.MeetingTimeRatings
            .AsNoTracking()
            .Where(r => ids.Contains(r.SectionMeetingTimeId) && !r.IsDeleted)
            .GroupBy(r => r.SectionMeetingTimeId)
            .Select(g => new
            {
                MeetingTimeId = g.Key,
                Avg = g.Average(x => (double)x.Rating),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);
        var aggMap = aggregates.ToDictionary(x => x.MeetingTimeId);

        var myRatings = await _context.MeetingTimeRatings
            .AsNoTracking()
            .Where(r => r.UserId == userId && ids.Contains(r.SectionMeetingTimeId) && !r.IsDeleted)
            .Select(r => new { r.SectionMeetingTimeId, r.Rating })
            .ToListAsync(cancellationToken);
        var myMap = myRatings.ToDictionary(x => x.SectionMeetingTimeId, x => x.Rating);

        var list = meetingRows.Select(m =>
        {
            aggMap.TryGetValue(m.Id, out var agg);
            myMap.TryGetValue(m.Id, out var mine);
            return new MeetingTimeRatingSummaryDto
            {
                SectionMeetingTimeId = m.Id,
                SectionId = m.SectionId,
                SectionName = m.SectionName,
                Day = (int)m.Day,
                StartMinutes = m.StartMinutes,
                EndMinutes = m.EndMinutes,
                AverageRating = agg != null ? Math.Round(agg.Avg, 2) : 0,
                RatingCount = agg?.Count ?? 0,
                MyRating = mine > 0 ? mine : null
            };
        }).ToList();

        return Result<List<MeetingTimeRatingSummaryDto>>.Success(list);
    }

    public async Task<Result<MeetingTimeRatingSummaryDto>> UpsertAsync(
        Guid courseId,
        Guid meetingTimeId,
        UpsertMeetingTimeRatingRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (request.Rating is < 1 or > 5)
            return Result<MeetingTimeRatingSummaryDto>.Failure("Rating must be between 1 and 5.");

        var mt = await _context.SectionMeetingTimes
            .Include(m => m.Section)
            .FirstOrDefaultAsync(
                m => m.Id == meetingTimeId && m.Section.CourseId == courseId && !m.IsDeleted && !m.Section.IsDeleted,
                cancellationToken);
        if (mt == null)
            return Result<MeetingTimeRatingSummaryDto>.Failure("Meeting time not found.");

        var enrolled = await _context.Enrollments.AnyAsync(
            e => e.UserId == userId && e.CourseId == courseId && !e.IsDeleted
                 && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
            cancellationToken);
        if (!enrolled)
            return Result<MeetingTimeRatingSummaryDto>.Failure("You must be enrolled in this course to rate a meeting slot.");

        var existing = await _context.MeetingTimeRatings
            .FirstOrDefaultAsync(
                r => r.SectionMeetingTimeId == meetingTimeId && r.UserId == userId && !r.IsDeleted,
                cancellationToken);

        if (existing != null)
        {
            existing.Rating = request.Rating;
            existing.Comment = request.Comment?.Trim();
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.MeetingTimeRatings.Add(new MeetingTimeRating
            {
                UserId = userId,
                SectionMeetingTimeId = meetingTimeId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim()
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var q = _context.MeetingTimeRatings.AsNoTracking()
            .Where(r => r.SectionMeetingTimeId == meetingTimeId && !r.IsDeleted);
        var count = await q.CountAsync(cancellationToken);
        var avg = count > 0
            ? await q.AverageAsync(r => (double)r.Rating, cancellationToken)
            : (double)request.Rating;

        return Result<MeetingTimeRatingSummaryDto>.Success(new MeetingTimeRatingSummaryDto
        {
            SectionMeetingTimeId = meetingTimeId,
            SectionId = mt.SectionId,
            SectionName = mt.Section.Name,
            Day = (int)mt.Day,
            StartMinutes = mt.StartMinutes,
            EndMinutes = mt.EndMinutes,
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
