using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.AI;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

/// <summary>
/// Recommendation service using collaborative filtering and content-based filtering algorithms
/// All processing is done in-memory without external API dependencies
/// </summary>
public class RecommendationService : IRecommendationService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<RecommendationService> _logger;

    // Map onboarding categories (both IDs and full names) to course categories
    // Supports both "business" (ID) and "Business & Management" (full name) formats
    private static readonly Dictionary<string, List<string>> CategoryMapping = new(StringComparer.OrdinalIgnoreCase)
    {
        // Category IDs (used by frontend after fix)
        ["technology"] = new() { "Programming", "Cloud Computing", "Mobile Development", "Security", "DevOps" },
        ["data-science"] = new() { "Data Science", "Machine Learning", "AI", "Analytics", "Big Data" },
        ["business"] = new() { "Business", "Marketing", "Finance", "Management", "Entrepreneurship" },
        ["design"] = new() { "Design", "UI/UX", "Graphic Design", "Web Design", "Creative" },
        ["personal-development"] = new() { "Personal Development", "Leadership", "Communication", "Productivity" },
        ["science"] = new() { "Science", "Mathematics", "Physics", "Chemistry", "Biology" },
        ["blockchain"] = new() { "Blockchain", "Web3", "Cryptocurrency", "Smart Contracts" },
        ["game-development"] = new() { "Game Development", "Unity", "Unreal", "Game Design" },

        // Full category names (for backward compatibility with existing users)
        ["Technology & Programming"] = new() { "Programming", "Cloud Computing", "Mobile Development", "Security", "DevOps" },
        ["Data Science & Analytics"] = new() { "Data Science", "Machine Learning", "AI", "Analytics", "Big Data" },
        ["Business & Management"] = new() { "Business", "Marketing", "Finance", "Management", "Entrepreneurship" },
        ["Design & Creative"] = new() { "Design", "UI/UX", "Graphic Design", "Web Design", "Creative" },
        ["Personal Development"] = new() { "Personal Development", "Leadership", "Communication", "Productivity" },
        ["Science & Mathematics"] = new() { "Science", "Mathematics", "Physics", "Chemistry", "Biology" }
    };

    public RecommendationService(IApplicationDbContext context, ILogger<RecommendationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Expand onboarding categories to matching course categories
    /// </summary>
    private HashSet<string> ExpandCategories(IEnumerable<string> onboardingCategories)
    {
        var expandedCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var category in onboardingCategories)
        {
            // Add the original category
            expandedCategories.Add(category);

            // Add mapped course categories
            if (CategoryMapping.TryGetValue(category, out var mappedCategories))
            {
                foreach (var mapped in mappedCategories)
                {
                    expandedCategories.Add(mapped);
                }
            }
        }

        return expandedCategories;
    }

    public async Task<Result<RecommendationsResponse>> GetRecommendationsAsync(Guid userId, int limit = 10, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = new RecommendationsResponse();

            // Get user's enrollment history
            var userEnrollments = await _context.Enrollments
                .Include(e => e.Course)
                    .ThenInclude(c => c.CourseTags)
                        .ThenInclude(ct => ct.Tag)
                .Where(e => e.UserId == userId && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            var enrolledCourseIds = userEnrollments.Select(e => e.CourseId).ToHashSet();

            // 1. Content-Based: Courses similar to what user has enrolled in
            var forYouCourses = await GetContentBasedRecommendationsAsync(userId, userEnrollments, enrolledCourseIds, limit, cancellationToken);
            response.ForYou = forYouCourses;

            // 2. Trending: Popular courses based on recent enrollments
            var trendingResult = await GetTrendingCoursesAsync(limit, cancellationToken);
            if (trendingResult.IsSuccess)
            {
                response.Trending = trendingResult.Value!
                    .Where(c => !enrolledCourseIds.Contains(c.CourseId))
                    .Take(limit)
                    .ToList();
            }

            // 3. Collaborative: "Because you enrolled in X, you might like Y"
            response.BecauseYouEnrolled = await GetCollaborativeRecommendationsAsync(userId, userEnrollments, enrolledCourseIds, limit, cancellationToken);

            // 4. New in your field
            var newInFieldResult = await GetNewInYourFieldAsync(userId, limit, cancellationToken);
            if (newInFieldResult.IsSuccess)
            {
                response.NewInYourField = newInFieldResult.Value!;
            }

            // 5. From your instructors
            var instructorResult = await GetFromYourInstructorsAsync(userId, limit, cancellationToken);
            if (instructorResult.IsSuccess)
            {
                response.FromYourInstructors = instructorResult.Value!;
            }

            return Result<RecommendationsResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating recommendations for user {UserId}", userId);
            return Result<RecommendationsResponse>.Failure("Failed to generate recommendations.");
        }
    }

    public async Task<Result<SimilarCoursesResponse>> GetSimilarCoursesAsync(Guid courseId, int limit = 6, CancellationToken cancellationToken = default)
    {
        try
        {
            var sourceCourse = await _context.Courses
                .Include(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
                .Include(c => c.Instructor)
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

            if (sourceCourse == null)
            {
                return Result<SimilarCoursesResponse>.Failure("Course not found.");
            }

            var sourceTagNames = sourceCourse.CourseTags
                .Where(ct => !ct.IsDeleted)
                .Select(ct => ct.Tag.Name)
                .ToHashSet();

            // Get all published courses except source
            var allCourses = await _context.Courses
                .Include(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
                .Include(c => c.Instructor)
                .Where(c => !c.IsDeleted && c.Status == CourseStatus.Published && c.Id != courseId)
                .ToListAsync(cancellationToken);

            // Calculate similarity scores
            var scoredCourses = allCourses.Select(course =>
            {
                var courseTagNames = course.CourseTags
                    .Where(ct => !ct.IsDeleted)
                    .Select(ct => ct.Tag.Name)
                    .ToHashSet();

                double score = 0;

                // Tag similarity (Jaccard similarity)
                if (sourceTagNames.Count > 0 && courseTagNames.Count > 0)
                {
                    var intersection = sourceTagNames.Intersect(courseTagNames).Count();
                    var union = sourceTagNames.Union(courseTagNames).Count();
                    score += (double)intersection / union * 40; // Max 40 points for tags
                }

                // Category match
                if (course.Category == sourceCourse.Category)
                {
                    score += 25;
                }

                // Level similarity
                var levelDiff = Math.Abs((int)course.Level - (int)sourceCourse.Level);
                score += (3 - levelDiff) * 5; // Max 15 points for level

                // Same instructor bonus
                if (course.InstructorId == sourceCourse.InstructorId)
                {
                    score += 10;
                }

                // Rating bonus
                score += (double)course.Rating * 2; // Max 10 points for rating

                return new { Course = course, Score = score };
            })
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .ToList();

            var response = new SimilarCoursesResponse
            {
                SourceCourseId = courseId,
                SourceCourseTitle = sourceCourse.Title,
                SimilarCourses = scoredCourses.Select(x => MapToCourseRecommendation(
                    x.Course,
                    x.Score,
                    "Similar content and topics",
                    RecommendationType.ContentBased
                )).ToList()
            };

            return Result<SimilarCoursesResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar courses for {CourseId}", courseId);
            return Result<SimilarCoursesResponse>.Failure("Failed to get similar courses.");
        }
    }

    public async Task<Result<List<CourseRecommendationDto>>> GetTrendingCoursesAsync(int limit = 10, CancellationToken cancellationToken = default)
    {
        try
        {
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            // Get enrollment counts for last 30 days
            var trendingData = await _context.Enrollments
                .Where(e => !e.IsDeleted && e.EnrolledAt >= thirtyDaysAgo)
                .GroupBy(e => e.CourseId)
                .Select(g => new { CourseId = g.Key, EnrollmentCount = g.Count() })
                .OrderByDescending(x => x.EnrollmentCount)
                .Take(limit * 2) // Get more to filter
                .ToListAsync(cancellationToken);

            var trendingCourseIds = trendingData.Select(x => x.CourseId).ToList();

            var courses = await _context.Courses
                .Include(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
                .Include(c => c.Instructor)
                .Where(c => trendingCourseIds.Contains(c.Id) && !c.IsDeleted && c.Status == CourseStatus.Published)
                .ToListAsync(cancellationToken);

            var recommendations = trendingData
                .Join(courses, t => t.CourseId, c => c.Id, (t, c) => new { Course = c, t.EnrollmentCount })
                .OrderByDescending(x => x.EnrollmentCount)
                .Take(limit)
                .Select((x, index) =>
                {
                    // Score based on enrollment count (normalized)
                    var maxEnrollments = trendingData.Max(t => t.EnrollmentCount);
                    var score = maxEnrollments > 0 ? (double)x.EnrollmentCount / maxEnrollments * 100 : 50;

                    return MapToCourseRecommendation(
                        x.Course,
                        score,
                        $"Trending - {x.EnrollmentCount} new enrollments this month",
                        RecommendationType.Trending
                    );
                })
                .ToList();

            return Result<List<CourseRecommendationDto>>.Success(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending courses");
            return Result<List<CourseRecommendationDto>>.Failure("Failed to get trending courses.");
        }
    }

    public async Task<Result<List<CourseRecommendationDto>>> GetFromYourInstructorsAsync(Guid userId, int limit = 6, CancellationToken cancellationToken = default)
    {
        try
        {
            // Get instructors user has taken courses with
            var userInstructorIds = await _context.Enrollments
                .Include(e => e.Course)
                .Where(e => e.UserId == userId && !e.IsDeleted)
                .Select(e => e.Course.InstructorId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (!userInstructorIds.Any())
            {
                return Result<List<CourseRecommendationDto>>.Success(new List<CourseRecommendationDto>());
            }

            // Get enrolled course IDs to exclude
            var enrolledCourseIds = await _context.Enrollments
                .Where(e => e.UserId == userId && !e.IsDeleted)
                .Select(e => e.CourseId)
                .ToListAsync(cancellationToken);

            // Get other courses from those instructors
            var courses = await _context.Courses
                .Include(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
                .Include(c => c.Instructor)
                .Where(c => userInstructorIds.Contains(c.InstructorId)
                    && !enrolledCourseIds.Contains(c.Id)
                    && !c.IsDeleted
                    && c.Status == CourseStatus.Published)
                .OrderByDescending(c => c.Rating)
                .ThenByDescending(c => c.CreatedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            var recommendations = courses.Select(c => MapToCourseRecommendation(
                c,
                75 + (double)c.Rating * 5, // Base 75 + rating bonus
                $"More from {c.Instructor?.FullName ?? "your instructor"}",
                RecommendationType.InstructorBased
            )).ToList();

            return Result<List<CourseRecommendationDto>>.Success(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting instructor recommendations for user {UserId}", userId);
            return Result<List<CourseRecommendationDto>>.Failure("Failed to get instructor recommendations.");
        }
    }

    public async Task<Result<List<CourseRecommendationDto>>> GetNewInYourFieldAsync(Guid userId, int limit = 6, CancellationToken cancellationToken = default)
    {
        try
        {
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            // Get user's preferred categories
            var userCategories = await _context.Enrollments
                .Include(e => e.Course)
                .Where(e => e.UserId == userId && !e.IsDeleted)
                .Select(e => e.Course.Category)
                .ToListAsync(cancellationToken);

            var categoryCounts = userCategories
                .GroupBy(c => c)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .Take(3)
                .ToList();

            if (!categoryCounts.Any())
            {
                return Result<List<CourseRecommendationDto>>.Success(new List<CourseRecommendationDto>());
            }

            // Get enrolled course IDs to exclude
            var enrolledCourseIds = await _context.Enrollments
                .Where(e => e.UserId == userId && !e.IsDeleted)
                .Select(e => e.CourseId)
                .ToListAsync(cancellationToken);

            // Get new courses in those categories
            var courses = await _context.Courses
                .Include(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
                .Include(c => c.Instructor)
                .Where(c => categoryCounts.Contains(c.Category)
                    && !enrolledCourseIds.Contains(c.Id)
                    && !c.IsDeleted
                    && c.Status == CourseStatus.Published
                    && c.CreatedAt >= thirtyDaysAgo)
                .OrderByDescending(c => c.CreatedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            var recommendations = courses.Select(c => MapToCourseRecommendation(
                c,
                70 + (double)c.Rating * 5,
                $"New in {c.Category}",
                RecommendationType.NewInCategory
            )).ToList();

            return Result<List<CourseRecommendationDto>>.Success(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting new courses for user {UserId}", userId);
            return Result<List<CourseRecommendationDto>>.Failure("Failed to get new courses.");
        }
    }

    public async Task<Result<List<CourseRecommendationDto>>> GetContinueLearningAsync(Guid userId, int limit = 6, CancellationToken cancellationToken = default)
    {
        try
        {
            var enrollments = await _context.Enrollments
                .Include(e => e.Course)
                    .ThenInclude(c => c.CourseTags)
                        .ThenInclude(ct => ct.Tag)
                .Include(e => e.Course)
                    .ThenInclude(c => c.Instructor)
                .Where(e => e.UserId == userId
                    && !e.IsDeleted
                    && e.Status == EnrollmentStatus.Active
                    && e.ProgressPercentage < 100)
                .OrderByDescending(e => e.ProgressPercentage) // Prioritize nearly complete
                .ThenByDescending(e => e.UpdatedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            var recommendations = enrollments.Select(e => MapToCourseRecommendation(
                e.Course,
                50 + (double)e.ProgressPercentage / 2, // Higher score for more progress
                $"Continue - {e.ProgressPercentage:F0}% complete",
                RecommendationType.ContinueLearning
            )).ToList();

            return Result<List<CourseRecommendationDto>>.Success(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting continue learning for user {UserId}", userId);
            return Result<List<CourseRecommendationDto>>.Failure("Failed to get continue learning recommendations.");
        }
    }

    private async Task<List<CourseRecommendationDto>> GetContentBasedRecommendationsAsync(
        Guid userId,
        List<Enrollment> userEnrollments,
        HashSet<Guid> enrolledCourseIds,
        int limit,
        CancellationToken cancellationToken)
    {
        // Get user interests from onboarding
        var userInterests = await _context.UserInterests
            .Where(i => i.UserId == userId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        _logger.LogInformation("=== USER INTERESTS FROM DB for user {UserId} ===", userId);
        _logger.LogInformation("User has {Count} interest records", userInterests.Count);
        foreach (var interest in userInterests)
        {
            _logger.LogInformation("  Interest: Category='{Category}', Topic='{Topic}', Level='{Level}', Score={Score}",
                interest.Category, interest.Topic ?? "(null)", interest.PreferredLevel?.ToString() ?? "(null)", interest.InterestScore);
        }

        _logger.LogInformation("=== USER ENROLLMENTS for user {UserId} ===", userId);
        _logger.LogInformation("User has {Count} enrollments", userEnrollments.Count);
        foreach (var enrollment in userEnrollments)
        {
            _logger.LogInformation("  Enrollment: Course='{Title}', Category='{Category}'",
                enrollment.Course?.Title ?? "(null)", enrollment.Course?.Category ?? "(null)");
        }

        if (!userEnrollments.Any())
        {
            _logger.LogInformation("User has NO enrollments, using interests-based recommendations");
            // New user - use interests from onboarding if available
            if (userInterests.Any())
            {
                return await GetRecommendationsFromInterestsAsync(userInterests, enrolledCourseIds, limit, cancellationToken);
            }

            // No enrollments and no interests - return popular courses
            var popularCourses = await _context.Courses
                .Include(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
                .Include(c => c.Instructor)
                .Where(c => !c.IsDeleted && c.Status == CourseStatus.Published)
                .OrderByDescending(c => c.Rating)
                .ThenByDescending(c => c.RatingCount)
                .Take(limit)
                .ToListAsync(cancellationToken);

            return popularCourses.Select(c => MapToCourseRecommendation(
                c,
                50 + (double)c.Rating * 10,
                "Popular course",
                RecommendationType.ContentBased
            )).ToList();
        }

        // Build user profile based on enrolled courses
        var userTags = userEnrollments
            .SelectMany(e => e.Course.CourseTags.Where(ct => !ct.IsDeleted).Select(ct => ct.Tag.Name))
            .GroupBy(t => t)
            .ToDictionary(g => g.Key, g => g.Count());

        var userCategories = userEnrollments
            .Select(e => e.Course.Category)
            .GroupBy(c => c)
            .ToDictionary(g => g.Key, g => g.Count());

        var userLevels = userEnrollments
            .Select(e => e.Course.Level)
            .GroupBy(l => l)
            .ToDictionary(g => g.Key, g => g.Count());

        // Enhance profile with user interests from onboarding
        // Expand onboarding categories to match course categories
        var rawInterestCategories = userInterests.Select(i => i.Category).Distinct();
        var interestCategories = ExpandCategories(rawInterestCategories);

        var interestTopics = userInterests
            .Where(i => !string.IsNullOrEmpty(i.Topic))
            .Select(i => i.Topic!.ToLower())
            .Distinct()
            .ToHashSet();

        var interestLevels = userInterests
            .Where(i => i.PreferredLevel.HasValue)
            .GroupBy(i => i.PreferredLevel!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.InterestScore));

        // Get all available courses
        var availableCourses = await _context.Courses
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .Include(c => c.Instructor)
            .Where(c => !c.IsDeleted
                && c.Status == CourseStatus.Published
                && !enrolledCourseIds.Contains(c.Id))
            .ToListAsync(cancellationToken);

        _logger.LogInformation("=== SCORING COURSES (with enrollments) ===");
        _logger.LogInformation("User categories from enrollments: [{Categories}]", string.Join(", ", userCategories.Select(kv => $"{kv.Key}:{kv.Value}")));
        _logger.LogInformation("Interest categories (expanded): [{Categories}]", string.Join(", ", interestCategories));
        _logger.LogInformation("Interest topics: [{Topics}]", string.Join(", ", interestTopics));

        // Score courses based on similarity to user profile
        var scoredCourses = availableCourses.Select(course =>
        {
            double enrollmentTagScore = 0;
            double enrollmentCatScore = 0;
            double enrollmentLevelScore = 0;
            double interestCatScore = 0;
            double interestTopicScore = 0;
            double interestLevelScore = 0;
            double ratingScore = 0;

            // Tag match score from enrollments
            var courseTags = course.CourseTags.Where(ct => !ct.IsDeleted).Select(ct => ct.Tag.Name).ToList();
            foreach (var tag in courseTags)
            {
                if (userTags.TryGetValue(tag, out var count))
                {
                    enrollmentTagScore += count * 5; // 5 points per tag match
                }
            }

            // Category match score from enrollments
            if (userCategories.TryGetValue(course.Category, out var catCount))
            {
                enrollmentCatScore = catCount * 10; // 10 points per category match
            }

            // Level preference score from enrollments
            if (userLevels.TryGetValue(course.Level, out var levelCount))
            {
                enrollmentLevelScore = levelCount * 3;
            }

            // Interest-based scoring (from onboarding) - PRIORITIZE USER INTERESTS
            // interestCategories is expanded to include mapped course categories
            // Give significant weight to interests since user explicitly selected them
            if (interestCategories.Contains(course.Category))
            {
                interestCatScore = 50; // High bonus for matching onboarding interests
            }

            // Topic/tag match with onboarding interests
            var courseTagsLower = courseTags.Select(t => t.ToLower()).ToList();
            var topicMatches = courseTagsLower.Count(tag =>
                interestTopics.Any(it => tag.Contains(it) || it.Contains(tag)));
            interestTopicScore = topicMatches * 15; // Increased weight for topic matches

            // Level preference from onboarding
            if (interestLevels.TryGetValue(course.Level, out var interestScore))
            {
                interestLevelScore = interestScore * 3;
            }

            // Bonus for highly rated courses
            ratingScore = (double)course.Rating * 5;

            var totalScore = enrollmentTagScore + enrollmentCatScore + enrollmentLevelScore +
                           interestCatScore + interestTopicScore + interestLevelScore + ratingScore;

            // Normalize to 0-100
            var normalizedScore = Math.Min(100, totalScore);

            return new {
                Course = course,
                Score = normalizedScore,
                EnrollmentTagScore = enrollmentTagScore,
                EnrollmentCatScore = enrollmentCatScore,
                InterestCatScore = interestCatScore,
                InterestTopicScore = interestTopicScore,
                RatingScore = ratingScore
            };
        })
        .OrderByDescending(x => x.Score)
        .ToList();

        // Log top 10 scored courses for debugging
        _logger.LogInformation("=== TOP 10 SCORED COURSES ===");
        foreach (var sc in scoredCourses.Take(10))
        {
            _logger.LogInformation(
                "  '{Title}' (Cat:{Category}) => EnrollCat={EnrollCat}, InterestCat={InterestCat}, EnrollTag={EnrollTag}, InterestTopic={InterestTopic}, Rating={Rating} => TOTAL={Score}",
                sc.Course.Title, sc.Course.Category, sc.EnrollmentCatScore, sc.InterestCatScore, sc.EnrollmentTagScore, sc.InterestTopicScore, sc.RatingScore, sc.Score);
        }

        var result = scoredCourses.Take(limit).ToList();

        return result.Select(x => MapToCourseRecommendation(
            x.Course,
            x.Score,
            "Based on your interests",
            RecommendationType.ContentBased
        )).ToList();
    }

    private async Task<List<CourseRecommendationDto>> GetCollaborativeRecommendationsAsync(
        Guid userId,
        List<Enrollment> userEnrollments,
        HashSet<Guid> enrolledCourseIds,
        int limit,
        CancellationToken cancellationToken)
    {
        if (!userEnrollments.Any())
        {
            return new List<CourseRecommendationDto>();
        }

        // Find users who enrolled in the same courses
        var userCourseIds = userEnrollments.Select(e => e.CourseId).ToList();

        var similarUserIds = await _context.Enrollments
            .Where(e => userCourseIds.Contains(e.CourseId)
                && e.UserId != userId
                && !e.IsDeleted)
            .Select(e => e.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (!similarUserIds.Any())
        {
            return new List<CourseRecommendationDto>();
        }

        // Get courses those users also enrolled in (that current user hasn't)
        var recommendedCourseData = await _context.Enrollments
            .Include(e => e.Course)
                .ThenInclude(c => c.CourseTags)
                    .ThenInclude(ct => ct.Tag)
            .Include(e => e.Course)
                .ThenInclude(c => c.Instructor)
            .Where(e => similarUserIds.Contains(e.UserId)
                && !enrolledCourseIds.Contains(e.CourseId)
                && !e.IsDeleted
                && e.Course.Status == CourseStatus.Published)
            .GroupBy(e => e.Course)
            .Select(g => new { Course = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(limit)
            .ToListAsync(cancellationToken);

        // Find a reference course for the reason
        var referenceCourse = userEnrollments
            .OrderByDescending(e => e.EnrolledAt)
            .FirstOrDefault()?.Course;

        return recommendedCourseData.Select(x => MapToCourseRecommendation(
            x.Course,
            60 + Math.Min(40, x.Count * 5), // Base 60 + enrollment count bonus
            referenceCourse != null
                ? $"Students who took \"{referenceCourse.Title.Substring(0, Math.Min(30, referenceCourse.Title.Length))}...\" also enrolled"
                : "Students with similar interests enrolled",
            RecommendationType.Collaborative
        )).ToList();
    }

    /// <summary>
    /// Get recommendations based on user interests collected during onboarding
    /// </summary>
    private async Task<List<CourseRecommendationDto>> GetRecommendationsFromInterestsAsync(
        List<UserInterest> userInterests,
        HashSet<Guid> enrolledCourseIds,
        int limit,
        CancellationToken cancellationToken)
    {
        // Extract interest categories and expand to course categories
        var rawCategories = userInterests.Select(i => i.Category).Distinct().ToList();
        var interestCategories = ExpandCategories(rawCategories);

        _logger.LogInformation("=== RECOMMENDATION DEBUG ===");
        _logger.LogInformation("Raw user interest categories: [{Categories}]", string.Join(", ", rawCategories));
        _logger.LogInformation("Expanded categories: [{Categories}]", string.Join(", ", interestCategories));

        var interestTopics = userInterests
            .Where(i => !string.IsNullOrEmpty(i.Topic))
            .Select(i => i.Topic!.ToLower())
            .Distinct()
            .ToHashSet();

        _logger.LogInformation("Interest topics: [{Topics}]", string.Join(", ", interestTopics));

        var preferredLevels = userInterests
            .Where(i => i.PreferredLevel.HasValue)
            .Select(i => i.PreferredLevel!.Value)
            .Distinct()
            .ToHashSet();

        // Get all available courses
        var availableCourses = await _context.Courses
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .Include(c => c.Instructor)
            .Where(c => !c.IsDeleted
                && c.Status == CourseStatus.Published
                && !enrolledCourseIds.Contains(c.Id))
            .ToListAsync(cancellationToken);

        _logger.LogInformation("Available courses count: {Count}", availableCourses.Count);
        foreach (var c in availableCourses)
        {
            _logger.LogInformation("  Available course: '{Title}' - Category: '{Category}'", c.Title, c.Category);
        }

        // Score courses based on interest matching
        var scoredCourses = availableCourses.Select(course =>
        {
            double score = 0;
            double categoryScore = 0;
            double topicScore = 0;
            double keywordScore = 0;
            double levelScore = 0;
            double ratingScore = 0;

            // Category match (highest weight) - uses expanded categories
            if (interestCategories.Contains(course.Category))
            {
                categoryScore = 35;
                score += categoryScore;
            }

            // Topic/tag match
            var courseTags = course.CourseTags
                .Where(ct => !ct.IsDeleted)
                .Select(ct => ct.Tag.Name.ToLower())
                .ToList();

            var topicMatches = courseTags.Count(tag =>
                interestTopics.Any(it => tag.Contains(it) || it.Contains(tag)));
            topicScore = topicMatches * 15;
            score += topicScore;

            // Description keyword match
            var descriptionLower = course.Description.ToLower();
            var titleLower = course.Title.ToLower();
            var keywordMatches = interestTopics.Count(topic =>
                descriptionLower.Contains(topic) || titleLower.Contains(topic));
            keywordScore = keywordMatches * 10;
            score += keywordScore;

            // Level match
            if (preferredLevels.Contains(course.Level))
            {
                levelScore = 10;
                score += levelScore;
            }

            // Bonus for highly rated courses
            ratingScore = (double)course.Rating * 5;
            score += ratingScore;

            _logger.LogInformation(
                "Course '{Title}' scoring: Category({CatMatch})={CatScore}, Topic={TopicScore}, Keyword={KeywordScore}, Level={LevelScore}, Rating={RatingScore} => Total={Total}",
                course.Title, interestCategories.Contains(course.Category), categoryScore, topicScore, keywordScore, levelScore, ratingScore, score);

            return new { Course = course, Score = Math.Min(100, score) };
        })
        .Where(x => x.Score > 0)
        .OrderByDescending(x => x.Score)
        .Take(limit)
        .ToList();

        _logger.LogInformation("Scored courses after filtering (Score > 0): {Count}", scoredCourses.Count);
        foreach (var sc in scoredCourses)
        {
            _logger.LogInformation("  Final: '{Title}' - Score: {Score}", sc.Course.Title, sc.Score);
        }

        // If not enough courses match interests, supplement with popular courses
        if (scoredCourses.Count < limit)
        {
            var existingIds = scoredCourses.Select(x => x.Course.Id).ToHashSet();
            var popularCourses = availableCourses
                .Where(c => !existingIds.Contains(c.Id))
                .OrderByDescending(c => c.Rating)
                .ThenByDescending(c => c.RatingCount)
                .Take(limit - scoredCourses.Count)
                .Select(c => new { Course = c, Score = 40.0 + (double)c.Rating * 5 });

            scoredCourses.AddRange(popularCourses);
        }

        return scoredCourses.Select(x => MapToCourseRecommendation(
            x.Course,
            x.Score,
            "Based on your interests",
            RecommendationType.ContentBased
        )).ToList();
    }

    private static CourseRecommendationDto MapToCourseRecommendation(
        Course course,
        double score,
        string reason,
        RecommendationType type)
    {
        return new CourseRecommendationDto
        {
            CourseId = course.Id,
            Title = course.Title,
            Description = course.Description.Length > 200
                ? course.Description.Substring(0, 200) + "..."
                : course.Description,
            Category = course.Category,
            Level = course.Level.ToString(),
            ThumbnailUrl = course.ThumbnailUrl,
            Rating = course.Rating,
            RatingCount = course.RatingCount,
            InstructorName = course.Instructor?.FullName ?? "Unknown",
            Price = course.Price,
            Tags = course.CourseTags
                .Where(ct => !ct.IsDeleted)
                .Select(ct => ct.Tag.Name)
                .ToList(),
            Score = Math.Round(score, 1),
            RecommendationReason = reason,
            Type = type
        };
    }
}
