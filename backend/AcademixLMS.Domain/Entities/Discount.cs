using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// A discount created by a teacher for their course.
/// </summary>
public class Discount : BaseEntity
{
    public Guid CourseId { get; set; }

    /// <summary>Optional code students must enter to redeem. Null = automatic discount.</summary>
    public string? Code { get; set; }

    public DiscountType Type { get; set; }

    /// <summary>Percentage (1-100) or fixed amount in smallest currency unit, depending on Type.</summary>
    public decimal Value { get; set; }

    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    /// <summary>Max number of times this discount can be used. Null = unlimited.</summary>
    public int? MaxUses { get; set; }

    /// <summary>How many times this discount has been used.</summary>
    public int UsedCount { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    public Course Course { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
