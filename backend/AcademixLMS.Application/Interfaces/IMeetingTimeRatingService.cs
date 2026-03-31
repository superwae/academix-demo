using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;

namespace AcademixLMS.Application.Interfaces;

public interface IMeetingTimeRatingService
{
    Task<Result<List<MeetingTimeRatingSummaryDto>>> GetSummariesForCourseAsync(Guid courseId, Guid userId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<Result<MeetingTimeRatingSummaryDto>> UpsertAsync(Guid courseId, Guid meetingTimeId, UpsertMeetingTimeRatingRequest request, Guid userId, CancellationToken cancellationToken = default);
}
