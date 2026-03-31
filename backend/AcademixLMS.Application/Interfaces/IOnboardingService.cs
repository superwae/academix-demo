using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Onboarding;

namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Service for managing user onboarding and interest collection
/// </summary>
public interface IOnboardingService
{
    /// <summary>
    /// Get available categories and topics for onboarding selection
    /// </summary>
    Task<OnboardingCategoriesResponse> GetCategoriesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get user's saved interests and onboarding data
    /// </summary>
    Task<Result<UserOnboardingDataResponse>> GetUserInterestsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Save user's interests during onboarding
    /// </summary>
    Task<Result> SaveUserInterestsAsync(Guid userId, SaveUserInterestsRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Mark onboarding as complete for a user
    /// </summary>
    Task<Result> CompleteOnboardingAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if user has completed onboarding
    /// </summary>
    Task<OnboardingStatusResponse> GetOnboardingStatusAsync(Guid userId, CancellationToken cancellationToken = default);
}
