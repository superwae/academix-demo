namespace AcademixLMS.Application.DTOs.Discount;

/// <summary>
/// Discount details.
/// </summary>
public class DiscountDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Teacher creates a discount for their course.
/// </summary>
public class CreateDiscountRequest
{
    public Guid CourseId { get; set; }
    public string? Code { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
}

/// <summary>
/// Teacher updates an existing discount.
/// </summary>
public class UpdateDiscountRequest
{
    public string? Code { get; set; }
    public string? Type { get; set; }
    public decimal? Value { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// Student validates a discount code for a course.
/// </summary>
public class ValidateDiscountRequest
{
    public Guid CourseId { get; set; }
    public string Code { get; set; } = string.Empty;
}

/// <summary>
/// Result of discount code validation.
/// </summary>
public class ValidateDiscountResponse
{
    public bool IsValid { get; set; }
    public string? Message { get; set; }
    public string? DiscountType { get; set; }
    public decimal? DiscountValue { get; set; }
    public long? OriginalPrice { get; set; }
    public long? DiscountedPrice { get; set; }
}
