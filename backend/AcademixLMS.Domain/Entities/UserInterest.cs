using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// User interests for content-based filtering recommendations
/// Collected during onboarding to personalize course recommendations
/// </summary>
public class UserInterest : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>
    /// Interest category (e.g., "Technology", "Business", "Design", "Data Science")
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Specific topic within the category (optional, e.g., "Web Development", "Machine Learning")
    /// </summary>
    public string? Topic { get; set; }

    /// <summary>
    /// User's preferred difficulty level for this category
    /// </summary>
    public CourseLevel? PreferredLevel { get; set; }

    /// <summary>
    /// How interested the user is (1-5 scale, higher = more interested)
    /// </summary>
    public int InterestScore { get; set; } = 3;

    // Navigation Property
    public User User { get; set; } = null!;
}

/// <summary>
/// User learning goals set during onboarding
/// </summary>
public class UserLearningGoal : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>
    /// Goal description (e.g., "Learn to code", "Career change", "Improve skills")
    /// </summary>
    public string Goal { get; set; } = string.Empty;

    /// <summary>
    /// Priority level (1 = highest priority)
    /// </summary>
    public int Priority { get; set; } = 1;

    // Navigation Property
    public User User { get; set; } = null!;
}
