namespace AcademixLMS.Application.DTOs.Finance;

public class FinanceOverviewDto
{
    public string Currency { get; set; } = "ILS";
    public List<FinanceTrendPointDto> RevenueTrend { get; set; } = new();
    public List<FinanceCategoryDto> RevenueByCategory { get; set; } = new();
    public List<FinanceTopCourseDto> TopCourses { get; set; } = new();
    public List<FinancePayoutDto> PendingPayouts { get; set; } = new();
}

public class FinanceTrendPointDto
{
    public string Period { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public long Revenue { get; set; }
    public long PayoutLiability { get; set; }
    public long Refunds { get; set; }
}

public class FinanceCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public long Value { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class FinanceTopCourseDto
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public long Revenue { get; set; }
    public int Payments { get; set; }
    public int Enrollments { get; set; }
}

public class FinancePayoutCourseDto
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long Earnings { get; set; }
    public int Payments { get; set; }
}

public class FinancePayoutDto
{
    public string Id { get; set; } = string.Empty;
    public Guid InstructorId { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public string InstructorEmail { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public long GrossAmount { get; set; }
    public long PlatformFee { get; set; }
    public long OrganizationShare { get; set; }
    public long NetAmount { get; set; }
    public int CourseCount { get; set; }
    public int PaymentCount { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<FinancePayoutCourseDto> Courses { get; set; } = new();
}

public class FinancePayoutSummaryDto
{
    public string Currency { get; set; } = "ILS";
    public long PendingTotal { get; set; }
    public int PendingCount { get; set; }
    public long ProcessingTotal { get; set; }
    public int ProcessingCount { get; set; }
    public long CompletedTotal { get; set; }
    public int CompletedCount { get; set; }
    public long OnHoldTotal { get; set; }
    public int OnHoldCount { get; set; }
    public int UniqueInstructors { get; set; }
}

public class FinanceInvoiceDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid PaymentId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientEmail { get; set; } = string.Empty;
    public string Item { get; set; } = string.Empty;
    public long Total { get; set; }
    public string Currency { get; set; } = "ILS";
    public string Status { get; set; } = "open";
    public DateTime IssuedAt { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class FinanceInvoiceSummaryDto
{
    public string Currency { get; set; } = "ILS";
    public long Outstanding { get; set; }
    public long CollectedLast30Days { get; set; }
    public int OpenCount { get; set; }
    public int PaidCount { get; set; }
}
