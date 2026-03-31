using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/courses/{courseId:guid}/meeting-time-ratings")]
[ApiVersion("1.0")]
[Authorize(Policy = "RequireStudent")]
[Tags("3. Courses")]
public class CourseMeetingTimeRatingsController : ControllerBase
{
    private readonly IMeetingTimeRatingService _ratings;

    public CourseMeetingTimeRatingsController(IMeetingTimeRatingService ratings)
    {
        _ratings = ratings;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(List<MeetingTimeRatingSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var isAdmin = User.HasRole("Admin") || User.HasRole("SuperAdmin");
        var result = await _ratings.GetSummariesForCourseAsync(courseId, userId, isAdmin, cancellationToken);
        if (!result.IsSuccess)
            return Forbid();
        return Ok(result.Value);
    }

    [HttpPut("meeting-times/{meetingTimeId:guid}")]
    [ProducesResponseType(typeof(MeetingTimeRatingSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upsert(
        Guid courseId,
        Guid meetingTimeId,
        [FromBody] UpsertMeetingTimeRatingRequest body,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _ratings.UpsertAsync(courseId, meetingTimeId, body, userId, cancellationToken);
        if (!result.IsSuccess)
            return BadRequest(result.Error);
        return Ok(result.Value);
    }
}
