using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Review;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class ReviewService : IReviewService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<ReviewService> _logger;

    public ReviewService(
        IApplicationDbContext context,
        ILogger<ReviewService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<ReviewDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var review = await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Course)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);

        if (review == null)
        {
            return Result<ReviewDto>.Failure("Review not found.");
        }

        var reviewDto = MapToReviewDto(review);
        return Result<ReviewDto>.Success(reviewDto);
    }

    public async Task<Result<PagedResult<ReviewDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        var query = _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Course)
            .Where(r => r.CourseId == courseId && !r.IsDeleted)
            .AsQueryable();

        // Visibility filter - only show visible reviews unless admin
        if (!includeHidden)
        {
            query = query.Where(r => r.IsVisible);
        }

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(r =>
                (r.Comment != null && r.Comment.ToLower().Contains(searchTerm)) ||
                r.User.FirstName.ToLower().Contains(searchTerm) ||
                r.User.LastName.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "rating" => request.SortDescending
                ? query.OrderByDescending(r => r.Rating)
                : query.OrderBy(r => r.Rating),
            "date" => request.SortDescending
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt),
            "verified" => request.SortDescending
                ? query.OrderByDescending(r => r.IsVerified).ThenByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.IsVerified).ThenBy(r => r.CreatedAt),
            _ => query.OrderByDescending(r => r.IsVerified).ThenByDescending(r => r.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var reviews = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var reviewDtos = reviews.Select(MapToReviewDto).ToList();

        return Result<PagedResult<ReviewDto>>.Success(new PagedResult<ReviewDto>
        {
            Items = reviewDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<PagedResult<ReviewDto>>> GetByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Course)
            .Where(r => r.UserId == userId && !r.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(r =>
                r.Course.Title.ToLower().Contains(searchTerm) ||
                (r.Comment != null && r.Comment.ToLower().Contains(searchTerm)));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "course" => request.SortDescending
                ? query.OrderByDescending(r => r.Course.Title)
                : query.OrderBy(r => r.Course.Title),
            "rating" => request.SortDescending
                ? query.OrderByDescending(r => r.Rating)
                : query.OrderBy(r => r.Rating),
            "date" => request.SortDescending
                ? query.OrderByDescending(r => r.CreatedAt)
                : query.OrderBy(r => r.CreatedAt),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var reviews = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var reviewDtos = reviews.Select(MapToReviewDto).ToList();

        return Result<PagedResult<ReviewDto>>.Success(new PagedResult<ReviewDto>
        {
            Items = reviewDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<ReviewDto>> CreateAsync(CreateReviewRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Business Rule 1: Validate user exists
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<ReviewDto>.Failure("User not found.");
        }

        // Business Rule 2: Validate course exists and is Published
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<ReviewDto>.Failure("Course not found.");
        }

        if (course.Status != CourseStatus.Published)
        {
            return Result<ReviewDto>.Failure("Cannot review: Course is not published.");
        }

        // Business Rule 3: Validate rating range (1-5)
        if (request.Rating < 1 || request.Rating > 5)
        {
            return Result<ReviewDto>.Failure("Rating must be between 1 and 5.");
        }

        // Business Rule 4: Check if user is enrolled (ownership check)
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e =>
                e.UserId == userId &&
                e.CourseId == request.CourseId &&
                !e.IsDeleted &&
                (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                cancellationToken);

        if (enrollment == null)
        {
            return Result<ReviewDto>.Failure("You must be enrolled in the course to leave a review.");
        }

        // Business Rule 5: Prevent duplicate reviews
        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r =>
                r.UserId == userId &&
                r.CourseId == request.CourseId &&
                !r.IsDeleted,
                cancellationToken);

        if (existingReview != null)
        {
            return Result<ReviewDto>.Failure("You have already reviewed this course. You can update your existing review.");
        }

        // Create review
        var review = new Review
        {
            UserId = userId,
            CourseId = request.CourseId,
            Rating = request.Rating,
            Comment = request.Comment,
            IsVisible = true,
            IsVerified = enrollment.Status == EnrollmentStatus.Completed, // Verified if completed
            CreatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync(cancellationToken);

        // Update course rating aggregation
        await UpdateCourseRatingAsync(course.Id, cancellationToken);

        // Reload with relations
        var createdReview = await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Course)
            .FirstAsync(r => r.Id == review.Id, cancellationToken);

        _logger.LogInformation("User {UserId} created review {ReviewId} for course {CourseId} with rating {Rating}", userId, review.Id, request.CourseId, request.Rating);

        var reviewDto = MapToReviewDto(createdReview);
        return Result<ReviewDto>.Success(reviewDto);
    }

    public async Task<Result<ReviewDto>> UpdateAsync(Guid id, UpdateReviewRequest request, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var review = await _context.Reviews
            .Include(r => r.Course)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);

        if (review == null)
        {
            return Result<ReviewDto>.Failure("Review not found.");
        }

        // Ownership check: User can only update their own reviews (unless Admin)
        if (!isAdmin && review.UserId != userId)
        {
            return Result<ReviewDto>.Failure("You can only update your own reviews.");
        }

        // Update rating if provided
        if (request.Rating.HasValue)
        {
            if (request.Rating.Value < 1 || request.Rating.Value > 5)
            {
                return Result<ReviewDto>.Failure("Rating must be between 1 and 5.");
            }
            review.Rating = request.Rating.Value;
        }

        // Update comment if provided
        if (request.Comment != null)
        {
            review.Comment = request.Comment;
        }

        // Update visibility if provided (only for own reviews or admin)
        if (request.IsVisible.HasValue)
        {
            review.IsVisible = request.IsVisible.Value;
        }

        review.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Update course rating aggregation
        await UpdateCourseRatingAsync(review.CourseId, cancellationToken);

        // Reload with relations
        var updatedReview = await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Course)
            .FirstAsync(r => r.Id == review.Id, cancellationToken);

        var reviewDto = MapToReviewDto(updatedReview);
        return Result<ReviewDto>.Success(reviewDto);
    }

    public async Task<Result> DeleteAsync(Guid id, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var review = await _context.Reviews
            .Include(r => r.Course)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);

        if (review == null)
        {
            return Result.Failure("Review not found.");
        }

        // Ownership check: User can only delete their own reviews (unless Admin)
        if (!isAdmin && review.UserId != userId)
        {
            return Result.Failure("You can only delete your own reviews.");
        }

        var courseId = review.CourseId;

        // Soft delete
        review.IsDeleted = true;
        review.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Update course rating aggregation
        await UpdateCourseRatingAsync(courseId, cancellationToken);

        _logger.LogInformation("Review {ReviewId} deleted by user {UserId}", id, userId);

        return Result.Success();
    }

    public async Task<Result<ReviewDto?>> GetUserReviewForCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var review = await _context.Reviews
            .Include(r => r.User)
            .Include(r => r.Course)
            .FirstOrDefaultAsync(r =>
                r.UserId == userId &&
                r.CourseId == courseId &&
                !r.IsDeleted,
                cancellationToken);

        if (review == null)
        {
            return Result<ReviewDto?>.Success(null);
        }

        var reviewDto = MapToReviewDto(review);
        return Result<ReviewDto?>.Success(reviewDto);
    }

    /// <summary>
    /// Updates the course's aggregated rating and rating count based on all visible reviews
    /// </summary>
    private async Task UpdateCourseRatingAsync(Guid courseId, CancellationToken cancellationToken)
    {
        var reviews = await _context.Reviews
            .Where(r => r.CourseId == courseId && !r.IsDeleted && r.IsVisible)
            .ToListAsync(cancellationToken);

        var course = await _context.Courses
            .FirstAsync(c => c.Id == courseId, cancellationToken);

        if (reviews.Any())
        {
            course.Rating = (decimal)reviews.Average(r => r.Rating);
            course.RatingCount = reviews.Count;
        }
        else
        {
            course.Rating = 0;
            course.RatingCount = 0;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static ReviewDto MapToReviewDto(Review review)
    {
        return new ReviewDto
        {
            Id = review.Id,
            UserId = review.UserId,
            UserName = review.User?.FullName ?? string.Empty,
            UserProfilePictureUrl = review.User?.ProfilePictureUrl,
            CourseId = review.CourseId,
            CourseTitle = review.Course?.Title ?? string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            IsVisible = review.IsVisible,
            IsVerified = review.IsVerified,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        };
    }
}






















