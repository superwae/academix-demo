using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Subscription tier managed by SuperAdmin. Defines limits for organizations/independent teachers.
/// </summary>
public class SubscriptionPlan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }

    /// <summary>Max courses an org/teacher can create. Null = unlimited.</summary>
    public int? MaxCourses { get; set; }

    /// <summary>Max seats per individual course. Null = unlimited.</summary>
    public int? MaxSeatsPerCourse { get; set; }

    /// <summary>Max total seats across all courses. Null = unlimited.</summary>
    public int? MaxTotalSeats { get; set; }

    /// <summary>Extra capabilities stored as JSON for future extensibility.</summary>
    public string? FeaturesJson { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Display order in the pricing page (lower = first).</summary>
    public int SortOrder { get; set; }

    // Navigation
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
