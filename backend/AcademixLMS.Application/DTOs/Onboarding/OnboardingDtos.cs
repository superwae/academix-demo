using System.ComponentModel.DataAnnotations;
using AcademixLMS.Domain.Common;

namespace AcademixLMS.Application.DTOs.Onboarding;

/// <summary>
/// Category with available topics for onboarding selection
/// </summary>
public record OnboardingCategoryDto
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public List<string> Topics { get; init; } = new();
}

/// <summary>
/// Response with all available categories for onboarding
/// </summary>
public record OnboardingCategoriesResponse
{
    public List<OnboardingCategoryDto> Categories { get; init; } = new();
    public List<string> LearningGoalOptions { get; init; } = new();
    public List<string> ExperienceLevels { get; init; } = new();
}

/// <summary>
/// User's selected interest during onboarding
/// </summary>
public record UserInterestDto
{
    public string Category { get; init; } = string.Empty;
    public List<string> Topics { get; init; } = new();
    public string? PreferredLevel { get; init; }
    public int InterestScore { get; init; } = 3;
}

/// <summary>
/// Request to save user interests
/// </summary>
public record SaveUserInterestsRequest
{
    [Required]
    public List<UserInterestDto> Interests { get; init; } = new();

    public List<string> LearningGoals { get; init; } = new();

    public string? ExperienceLevel { get; init; }

    /// <summary>
    /// Weekly time commitment in hours
    /// </summary>
    public int? WeeklyTimeCommitment { get; init; }
}

/// <summary>
/// Response with user's current onboarding data
/// </summary>
public record UserOnboardingDataResponse
{
    public List<UserInterestDto> Interests { get; init; } = new();
    public List<string> LearningGoals { get; init; } = new();
    public string? ExperienceLevel { get; init; }
    public int? WeeklyTimeCommitment { get; init; }
    public bool OnboardingCompleted { get; init; }
    public DateTime? CompletedAt { get; init; }
}

/// <summary>
/// Response for onboarding status check
/// </summary>
public record OnboardingStatusResponse
{
    public bool IsCompleted { get; init; }
    public bool HasInterests { get; init; }
    public int InterestCount { get; init; }
    public DateTime? CompletedAt { get; init; }
}
