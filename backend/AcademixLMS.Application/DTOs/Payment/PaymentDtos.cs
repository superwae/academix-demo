namespace AcademixLMS.Application.DTOs.Payment;

/// <summary>
/// Payment record details.
/// </summary>
public class PaymentDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? LahzaReference { get; set; }
    public string? LahzaChannel { get; set; }
    public DateTime? PaidAt { get; set; }
    public Guid? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Guid? DiscountId { get; set; }
    public long? OriginalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request to initialize a course purchase payment.
/// </summary>
public class InitializePaymentRequest
{
    public Guid CourseId { get; set; }
    public string? DiscountCode { get; set; }
}

/// <summary>
/// Response after initializing a payment with Lahza.
/// </summary>
public class InitializePaymentResponse
{
    public Guid PaymentId { get; set; }
    public string AuthorizationUrl { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
}

/// <summary>
/// Payment list item for admin/accountant finance pages.
/// </summary>
public class PaymentListDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? CourseTitle { get; set; }
    public string? LahzaReference { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Aggregated payment statistics for the dashboard.
/// </summary>
public class PaymentSummaryDto
{
    public long TotalRevenue { get; set; }
    public string Currency { get; set; } = string.Empty;
    public int TotalPayments { get; set; }
    public int CompletedPayments { get; set; }
    public int PendingPayments { get; set; }
    public int FailedPayments { get; set; }
    public int RefundedPayments { get; set; }
    public long RevenueThisMonth { get; set; }
    public long RevenueLastMonth { get; set; }
}

/// <summary>
/// Filters for querying payments (admin/accountant).
/// </summary>
public class PaymentFilterRequest
{
    public string? Type { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? UserId { get; set; }
    public Guid? CourseId { get; set; }
}
