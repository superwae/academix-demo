namespace AcademixLMS.Application.DTOs.Course;

public class MeetingTimeRatingSummaryDto
{
    public Guid SectionMeetingTimeId { get; set; }
    public Guid SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public int Day { get; set; }
    public int StartMinutes { get; set; }
    public int EndMinutes { get; set; }
    public double AverageRating { get; set; }
    public int RatingCount { get; set; }
    public int? MyRating { get; set; }
}

public class UpsertMeetingTimeRatingRequest
{
    public int Rating { get; set; }
    public string? Comment { get; set; }
}
