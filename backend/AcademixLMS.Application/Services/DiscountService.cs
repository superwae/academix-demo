using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Discount;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class DiscountService : IDiscountService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DiscountService> _logger;

    public DiscountService(
        IApplicationDbContext context,
        ILogger<DiscountService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<DiscountDto>>> GetDiscountsForCourseAsync(Guid courseId, Guid instructorId, CancellationToken cancellationToken = default)
    {
        // Verify the instructor owns this course
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && c.InstructorId == instructorId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<List<DiscountDto>>.Failure("Course not found or you are not the instructor.");
        }

        var discounts = await _context.Discounts
            .Include(d => d.Course)
            .Where(d => d.CourseId == courseId && !d.IsDeleted)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = discounts.Select(MapToDiscountDto).ToList();
        return Result<List<DiscountDto>>.Success(dtos);
    }

    public async Task<Result<DiscountDto>> CreateDiscountAsync(CreateDiscountRequest request, Guid instructorId, CancellationToken cancellationToken = default)
    {
        // Verify the instructor owns this course
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && c.InstructorId == instructorId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<DiscountDto>.Failure("Course not found or you are not the instructor.");
        }

        // Validate discount type
        if (!Enum.TryParse<DiscountType>(request.Type, true, out var discountType))
        {
            return Result<DiscountDto>.Failure("Invalid discount type. Must be 'Percentage' or 'FixedAmount'.");
        }

        // Validate percentage range
        if (discountType == DiscountType.Percentage && (request.Value <= 0 || request.Value > 100))
        {
            return Result<DiscountDto>.Failure("Percentage discount value must be between 1 and 100.");
        }

        // Check for duplicate code on the same course
        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            var codeExists = await _context.Discounts
                .AnyAsync(d => d.CourseId == request.CourseId && d.Code == request.Code && !d.IsDeleted, cancellationToken);

            if (codeExists)
            {
                return Result<DiscountDto>.Failure("A discount with this code already exists for this course.");
            }
        }

        var discount = new Discount
        {
            CourseId = request.CourseId,
            Code = request.Code,
            Type = discountType,
            Value = request.Value,
            StartsAt = request.StartsAt,
            ExpiresAt = request.ExpiresAt,
            MaxUses = request.MaxUses,
            IsActive = true,
            CreatedBy = instructorId
        };

        _context.Discounts.Add(discount);
        await _context.SaveChangesAsync(cancellationToken);

        // Reload with navigation
        discount.Course = course;

        _logger.LogInformation("Discount created for course {CourseId} by instructor {InstructorId}.", request.CourseId, instructorId);
        return Result<DiscountDto>.Success(MapToDiscountDto(discount));
    }

    public async Task<Result<DiscountDto>> UpdateDiscountAsync(Guid id, UpdateDiscountRequest request, Guid instructorId, CancellationToken cancellationToken = default)
    {
        var discount = await _context.Discounts
            .Include(d => d.Course)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (discount == null)
        {
            return Result<DiscountDto>.Failure("Discount not found.");
        }

        // Verify ownership
        if (discount.Course.InstructorId != instructorId)
        {
            return Result<DiscountDto>.Failure("You are not the instructor of this course.");
        }

        if (request.Code != null) discount.Code = request.Code;
        if (request.Type != null && Enum.TryParse<DiscountType>(request.Type, true, out var discountType))
        {
            discount.Type = discountType;
        }
        if (request.Value.HasValue) discount.Value = request.Value.Value;
        if (request.StartsAt.HasValue) discount.StartsAt = request.StartsAt.Value;
        if (request.ExpiresAt.HasValue) discount.ExpiresAt = request.ExpiresAt.Value;
        if (request.MaxUses.HasValue) discount.MaxUses = request.MaxUses.Value;
        if (request.IsActive.HasValue) discount.IsActive = request.IsActive.Value;

        discount.UpdatedAt = DateTime.UtcNow;
        discount.UpdatedBy = instructorId;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Discount {DiscountId} updated by instructor {InstructorId}.", id, instructorId);
        return Result<DiscountDto>.Success(MapToDiscountDto(discount));
    }

    public async Task<Result> DeleteDiscountAsync(Guid id, Guid instructorId, CancellationToken cancellationToken = default)
    {
        var discount = await _context.Discounts
            .Include(d => d.Course)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (discount == null)
        {
            return Result.Failure("Discount not found.");
        }

        if (discount.Course.InstructorId != instructorId)
        {
            return Result.Failure("You are not the instructor of this course.");
        }

        discount.IsDeleted = true;
        discount.DeletedAt = DateTime.UtcNow;
        discount.DeletedBy = instructorId;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Discount {DiscountId} soft-deleted by instructor {InstructorId}.", id, instructorId);
        return Result.Success();
    }

    public async Task<Result<ValidateDiscountResponse>> ValidateDiscountAsync(Guid courseId, string code, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<ValidateDiscountResponse>.Failure("Course not found.");
        }

        var discount = await _context.Discounts
            .FirstOrDefaultAsync(d =>
                d.CourseId == courseId &&
                d.Code == code &&
                d.IsActive &&
                !d.IsDeleted, cancellationToken);

        if (discount == null)
        {
            return Result<ValidateDiscountResponse>.Success(new ValidateDiscountResponse
            {
                IsValid = false,
                Message = "Invalid discount code."
            });
        }

        // Check validity constraints
        if (discount.StartsAt.HasValue && DateTime.UtcNow < discount.StartsAt.Value)
        {
            return Result<ValidateDiscountResponse>.Success(new ValidateDiscountResponse
            {
                IsValid = false,
                Message = "This discount is not yet active."
            });
        }

        if (discount.ExpiresAt.HasValue && DateTime.UtcNow > discount.ExpiresAt.Value)
        {
            return Result<ValidateDiscountResponse>.Success(new ValidateDiscountResponse
            {
                IsValid = false,
                Message = "This discount has expired."
            });
        }

        if (discount.MaxUses.HasValue && discount.UsedCount >= discount.MaxUses.Value)
        {
            return Result<ValidateDiscountResponse>.Success(new ValidateDiscountResponse
            {
                IsValid = false,
                Message = "This discount has reached its maximum usage limit."
            });
        }

        // Calculate discounted price in dollars (same unit as course.Price)
        var originalPrice = course.Price ?? 0m;
        decimal discountedPrice;

        if (discount.Type == DiscountType.Percentage)
        {
            discountedPrice = originalPrice - (originalPrice * discount.Value / 100m);
        }
        else
        {
            // FixedAmount value is stored in dollars
            discountedPrice = Math.Max(0, originalPrice - discount.Value);
        }

        return Result<ValidateDiscountResponse>.Success(new ValidateDiscountResponse
        {
            IsValid = true,
            Message = "Discount code is valid.",
            DiscountType = discount.Type.ToString(),
            DiscountValue = discount.Value,
            OriginalPrice = originalPrice,
            DiscountedPrice = discountedPrice
        });
    }

    private static DiscountDto MapToDiscountDto(Discount discount) => new()
    {
        Id = discount.Id,
        CourseId = discount.CourseId,
        CourseTitle = discount.Course.Title,
        Code = discount.Code,
        Type = discount.Type.ToString(),
        Value = discount.Value,
        StartsAt = discount.StartsAt,
        ExpiresAt = discount.ExpiresAt,
        MaxUses = discount.MaxUses,
        UsedCount = discount.UsedCount,
        IsActive = discount.IsActive,
        CreatedAt = discount.CreatedAt
    };
}
