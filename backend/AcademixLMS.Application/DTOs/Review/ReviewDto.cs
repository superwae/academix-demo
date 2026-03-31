namespace AcademixLMS.Application.DTOs.Review;

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserProfilePictureUrl { get; set; }
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public bool IsVisible { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateReviewRequest
{
    public Guid CourseId { get; set; }
    public int Rating { get; set; } // 1-5
    public string? Comment { get; set; }
}

public class UpdateReviewRequest
{
    public int? Rating { get; set; }
    public string? Comment { get; set; }
    public bool? IsVisible { get; set; }
}






















