namespace AcademixLMS.Application.DTOs.Subscription;

/// <summary>
/// Subscription plan details for public listing (pricing page).
/// </summary>
public class SubscriptionPlanDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }
    public int? MaxCourses { get; set; }
    public int? MaxSeatsPerCourse { get; set; }
    public int? MaxTotalSeats { get; set; }
    public string? FeaturesJson { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// SuperAdmin creates a new subscription plan.
/// </summary>
public class CreateSubscriptionPlanRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }
    public int? MaxCourses { get; set; }
    public int? MaxSeatsPerCourse { get; set; }
    public int? MaxTotalSeats { get; set; }
    public string? FeaturesJson { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// SuperAdmin updates an existing subscription plan.
/// </summary>
public class UpdateSubscriptionPlanRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? MonthlyPrice { get; set; }
    public decimal? YearlyPrice { get; set; }
    public int? MaxCourses { get; set; }
    public int? MaxSeatsPerCourse { get; set; }
    public int? MaxTotalSeats { get; set; }
    public string? FeaturesJson { get; set; }
    public bool? IsActive { get; set; }
    public int? SortOrder { get; set; }
}

/// <summary>
/// Active subscription details for the subscriber.
/// </summary>
public class SubscriptionDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public Guid PlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string BillingInterval { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime? TrialEndsAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Quick check: can the user create more courses under their current plan?
/// </summary>
public class SubscriptionStatusDto
{
    public bool HasActiveSubscription { get; set; }
    public string? PlanName { get; set; }
    public int? MaxCourses { get; set; }
    public int CurrentCourseCount { get; set; }
    public bool CanCreateCourse { get; set; }
    public int? RemainingCourses { get; set; }
}
