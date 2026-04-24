using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Records every payment transaction (course purchase or subscription payment).
/// </summary>
public class Payment : BaseEntity
{
    public Guid UserId { get; set; }

    public PaymentType Type { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    /// <summary>Amount in the smallest currency unit (e.g. cents/agorot).</summary>
    public long Amount { get; set; }

    /// <summary>ISO 4217 currency code (ILS, USD, JOD).</summary>
    public string Currency { get; set; } = "ILS";

    /// <summary>Lahza transaction reference returned from initialize.</summary>
    public string? LahzaReference { get; set; }

    /// <summary>Lahza authorization code for reusable charges.</summary>
    public string? LahzaAuthorizationCode { get; set; }

    /// <summary>Raw Lahza channel used (card, bank, etc).</summary>
    public string? LahzaChannel { get; set; }

    public DateTime? PaidAt { get; set; }

    // Polymorphic: course purchase, subscription, or organization bulk license
    public Guid? CourseId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Guid? CourseLicenseId { get; set; }
    public Guid? OrganizationId { get; set; }

    /// <summary>Discount applied to this payment, if any.</summary>
    public Guid? DiscountId { get; set; }

    /// <summary>Original amount before discount (smallest currency unit).</summary>
    public long? OriginalAmount { get; set; }

    // Revenue split snapshot (populated when Payment transitions to Completed for CoursePurchase payments).
    // Stored in the smallest currency unit, just like Amount. Sum must equal Amount.
    public long? PlatformAmount { get; set; }
    public long? OrgAmount { get; set; }
    public long? InstructorAmount { get; set; }
    public Guid? InstructorUserId { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Course? Course { get; set; }
    public Subscription? Subscription { get; set; }
    public Discount? Discount { get; set; }
    public CourseLicense? CourseLicense { get; set; }
    public Organization? Organization { get; set; }
}
