namespace AcademixLMS.Application.DTOs.Course;

public class LessonRatingSummaryDto
{
    public Guid LessonId { get; set; }
    public string LessonTitle { get; set; } = string.Empty;
    public double AverageRating { get; set; }
    public int RatingCount { get; set; }
    public int? MyRating { get; set; }
}

public class UpsertLessonRatingRequest
{
    public int Rating { get; set; }
    public string? Comment { get; set; }
}
