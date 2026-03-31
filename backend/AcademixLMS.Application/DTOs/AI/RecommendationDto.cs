namespace AcademixLMS.Application.DTOs.AI;

/// <summary>
/// Represents a course recommendation with score and reasoning
/// </summary>
public class CourseRecommendationDto
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public decimal Rating { get; set; }
    public int RatingCount { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Recommendation score (0-100)
    /// </summary>
    public double Score { get; set; }

    /// <summary>
    /// Reason for recommendation (e.g., "Similar to courses you've taken", "Popular in your field")
    /// </summary>
    public string RecommendationReason { get; set; } = string.Empty;

    /// <summary>
    /// Type of recommendation algorithm used
    /// </summary>
    public RecommendationType Type { get; set; }
}

public enum RecommendationType
{
    ContentBased,       // Based on similar tags/categories
    Collaborative,      // Based on what similar users enrolled in
    Trending,           // Based on recent popularity
    ContinueLearning,   // Based on incomplete enrollments
    NewInCategory,      // New courses in user's preferred categories
    InstructorBased     // From instructors the user has taken courses with
}

/// <summary>
/// Response containing multiple recommendation lists
/// </summary>
public class RecommendationsResponse
{
    public List<CourseRecommendationDto> ForYou { get; set; } = new();
    public List<CourseRecommendationDto> Trending { get; set; } = new();
    public List<CourseRecommendationDto> BecauseYouEnrolled { get; set; } = new();
    public List<CourseRecommendationDto> NewInYourField { get; set; } = new();
    public List<CourseRecommendationDto> FromYourInstructors { get; set; } = new();
}

/// <summary>
/// Similar courses response
/// </summary>
public class SimilarCoursesResponse
{
    public Guid SourceCourseId { get; set; }
    public string SourceCourseTitle { get; set; } = string.Empty;
    public List<CourseRecommendationDto> SimilarCourses { get; set; } = new();
}
