using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Onboarding;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class OnboardingService : IOnboardingService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<OnboardingService> _logger;

    // Predefined categories with topics for onboarding
    private static readonly List<OnboardingCategoryDto> Categories = new()
    {
        new OnboardingCategoryDto
        {
            Id = "technology",
            Name = "Technology & Programming",
            Description = "Software development, web development, and IT skills",
            Icon = "Code",
            Topics = new List<string>
            {
                "Web Development",
                "Mobile Development",
                "Backend Development",
                "DevOps & Cloud",
                "Cybersecurity",
                "Artificial Intelligence",
                "Machine Learning",
                "Data Engineering"
            }
        },
        new OnboardingCategoryDto
        {
            Id = "data-science",
            Name = "Data Science & Analytics",
            Description = "Data analysis, visualization, and machine learning",
            Icon = "BarChart",
            Topics = new List<string>
            {
                "Data Analysis",
                "Data Visualization",
                "Statistical Analysis",
                "Python for Data Science",
                "R Programming",
                "Big Data",
                "Business Intelligence"
            }
        },
        new OnboardingCategoryDto
        {
            Id = "business",
            Name = "Business & Management",
            Description = "Business strategy, leadership, and management skills",
            Icon = "Briefcase",
            Topics = new List<string>
            {
                "Project Management",
                "Leadership",
                "Entrepreneurship",
                "Marketing",
                "Finance",
                "Strategy",
                "Operations"
            }
        },
        new OnboardingCategoryDto
        {
            Id = "design",
            Name = "Design & Creative",
            Description = "UI/UX design, graphic design, and creative skills",
            Icon = "Palette",
            Topics = new List<string>
            {
                "UI/UX Design",
                "Graphic Design",
                "Web Design",
                "Product Design",
                "Motion Graphics",
                "3D Modeling",
                "Photography"
            }
        },
        new OnboardingCategoryDto
        {
            Id = "personal-development",
            Name = "Personal Development",
            Description = "Soft skills, productivity, and personal growth",
            Icon = "User",
            Topics = new List<string>
            {
                "Communication Skills",
                "Time Management",
                "Critical Thinking",
                "Problem Solving",
                "Public Speaking",
                "Emotional Intelligence"
            }
        },
        new OnboardingCategoryDto
        {
            Id = "science",
            Name = "Science & Mathematics",
            Description = "Scientific concepts and mathematical foundations",
            Icon = "Atom",
            Topics = new List<string>
            {
                "Mathematics",
                "Physics",
                "Chemistry",
                "Biology",
                "Statistics",
                "Research Methods"
            }
        }
    };

    private static readonly List<string> LearningGoalOptions = new()
    {
        "Start a new career",
        "Get a promotion",
        "Learn new skills for my current job",
        "Personal interest / hobby",
        "Academic requirements",
        "Build a portfolio",
        "Start my own business",
        "Prepare for certifications"
    };

    private static readonly List<string> ExperienceLevels = new()
    {
        "Complete Beginner",
        "Some Experience",
        "Intermediate",
        "Advanced",
        "Expert"
    };

    public OnboardingService(IApplicationDbContext context, ILogger<OnboardingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public Task<OnboardingCategoriesResponse> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new OnboardingCategoriesResponse
        {
            Categories = Categories,
            LearningGoalOptions = LearningGoalOptions,
            ExperienceLevels = ExperienceLevels
        });
    }

    public async Task<Result<UserOnboardingDataResponse>> GetUserInterestsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Interests)
                .Include(u => u.LearningGoals)
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            if (user == null)
            {
                return Result<UserOnboardingDataResponse>.Failure("User not found");
            }

            // Group interests by category
            var interests = user.Interests
                .GroupBy(i => i.Category)
                .Select(g => new UserInterestDto
                {
                    Category = g.Key,
                    Topics = g.Where(i => !string.IsNullOrEmpty(i.Topic)).Select(i => i.Topic!).ToList(),
                    PreferredLevel = g.FirstOrDefault()?.PreferredLevel?.ToString(),
                    InterestScore = g.FirstOrDefault()?.InterestScore ?? 3
                })
                .ToList();

            var learningGoals = user.LearningGoals
                .OrderBy(lg => lg.Priority)
                .Select(lg => lg.Goal)
                .ToList();

            // Check if onboarding is complete (has at least one interest)
            var isComplete = user.Interests.Any();

            return Result<UserOnboardingDataResponse>.Success(new UserOnboardingDataResponse
            {
                Interests = interests,
                LearningGoals = learningGoals,
                OnboardingCompleted = isComplete,
                CompletedAt = isComplete ? user.Interests.Min(i => i.CreatedAt) : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user interests for user {UserId}", userId);
            return Result<UserOnboardingDataResponse>.Failure("Error retrieving user interests");
        }
    }

    public async Task<Result> SaveUserInterestsAsync(Guid userId, SaveUserInterestsRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Interests)
                .Include(u => u.LearningGoals)
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            if (user == null)
            {
                return Result.Failure("User not found");
            }

            // Clear existing interests and goals
            _context.UserInterests.RemoveRange(user.Interests);
            _context.UserLearningGoals.RemoveRange(user.LearningGoals);

            // Add new interests
            foreach (var interest in request.Interests)
            {
                // Parse preferred level
                CourseLevel? preferredLevel = null;
                if (!string.IsNullOrEmpty(interest.PreferredLevel) &&
                    Enum.TryParse<CourseLevel>(interest.PreferredLevel, true, out var level))
                {
                    preferredLevel = level;
                }

                // Add category interest
                var categoryInterest = new UserInterest
                {
                    UserId = userId,
                    Category = interest.Category,
                    PreferredLevel = preferredLevel,
                    InterestScore = interest.InterestScore
                };
                _context.UserInterests.Add(categoryInterest);

                // Add topic-specific interests
                foreach (var topic in interest.Topics)
                {
                    var topicInterest = new UserInterest
                    {
                        UserId = userId,
                        Category = interest.Category,
                        Topic = topic,
                        PreferredLevel = preferredLevel,
                        InterestScore = interest.InterestScore
                    };
                    _context.UserInterests.Add(topicInterest);
                }
            }

            // Add learning goals
            var priority = 1;
            foreach (var goal in request.LearningGoals)
            {
                var learningGoal = new UserLearningGoal
                {
                    UserId = userId,
                    Goal = goal,
                    Priority = priority++
                };
                _context.UserLearningGoals.Add(learningGoal);
            }

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Saved {InterestCount} interests and {GoalCount} learning goals for user {UserId}",
                request.Interests.Count, request.LearningGoals.Count, userId);

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving user interests for user {UserId}", userId);
            return Result.Failure("Error saving user interests");
        }
    }

    public async Task<Result> CompleteOnboardingAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var hasInterests = await _context.UserInterests.AnyAsync(i => i.UserId == userId, cancellationToken);

            if (!hasInterests)
            {
                return Result.Failure("Please select at least one interest before completing onboarding");
            }

            _logger.LogInformation("User {UserId} completed onboarding", userId);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing onboarding for user {UserId}", userId);
            return Result.Failure("Error completing onboarding");
        }
    }

    public async Task<OnboardingStatusResponse> GetOnboardingStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var interests = await _context.UserInterests
            .Where(i => i.UserId == userId)
            .ToListAsync(cancellationToken);

        var hasInterests = interests.Any();
        var completedAt = hasInterests ? interests.Min(i => i.CreatedAt) : (DateTime?)null;

        return new OnboardingStatusResponse
        {
            IsCompleted = hasInterests,
            HasInterests = hasInterests,
            InterestCount = interests.Select(i => i.Category).Distinct().Count(),
            CompletedAt = completedAt
        };
    }
}
