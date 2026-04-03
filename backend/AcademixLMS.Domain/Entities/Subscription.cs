using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// An active subscription linking an organization (Admin user) or independent teacher to a plan.
/// </summary>
public class Subscription : BaseEntity
{
    /// <summary>The user who owns the subscription (Admin = org, Instructor = independent teacher).</summary>
    public Guid UserId { get; set; }

    public Guid PlanId { get; set; }

    public BillingInterval BillingInterval { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }

    /// <summary>Lahza subscription reference for recurring billing.</summary>
    public string? LahzaSubscriptionCode { get; set; }

    /// <summary>Lahza customer code for this subscriber.</summary>
    public string? LahzaCustomerCode { get; set; }

    public DateTime? CancelledAt { get; set; }
    public DateTime? TrialEndsAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public SubscriptionPlan Plan { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
