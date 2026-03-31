using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.AI;

namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Service for generating course recommendations using collaborative and content-based filtering
/// </summary>
public interface IRecommendationService
{
    /// <summary>
    /// Get personalized recommendations for a user
    /// </summary>
    Task<Result<RecommendationsResponse>> GetRecommendationsAsync(Guid userId, int limit = 10, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get courses similar to a specific course
    /// </summary>
    Task<Result<SimilarCoursesResponse>> GetSimilarCoursesAsync(Guid courseId, int limit = 6, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get trending courses based on recent enrollments and activity
    /// </summary>
    Task<Result<List<CourseRecommendationDto>>> GetTrendingCoursesAsync(int limit = 10, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get courses from instructors the user has previously enrolled with
    /// </summary>
    Task<Result<List<CourseRecommendationDto>>> GetFromYourInstructorsAsync(Guid userId, int limit = 6, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get new courses in categories the user has shown interest in
    /// </summary>
    Task<Result<List<CourseRecommendationDto>>> GetNewInYourFieldAsync(Guid userId, int limit = 6, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get "continue learning" recommendations based on incomplete enrollments
    /// </summary>
    Task<Result<List<CourseRecommendationDto>>> GetContinueLearningAsync(Guid userId, int limit = 6, CancellationToken cancellationToken = default);
}
