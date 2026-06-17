using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Finance;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.Application.Services;

public class FinanceReportService : IFinanceReportService
{
    private readonly IApplicationDbContext _context;

    public FinanceReportService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<FinanceOverviewDto>> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var currency = await ResolveCurrencyAsync(cancellationToken);
        var overview = new FinanceOverviewDto
        {
            Currency = currency,
            RevenueTrend = await BuildRevenueTrendAsync(cancellationToken),
            RevenueByCategory = await BuildRevenueCategoriesAsync(cancellationToken),
            TopCourses = await BuildTopCoursesAsync(cancellationToken),
            PendingPayouts = (await BuildPayoutsAsync(cancellationToken))
                .OrderByDescending(x => x.NetAmount)
                .Take(5)
                .ToList()
        };

        return Result<FinanceOverviewDto>.Success(overview);
    }

    public async Task<Result<PagedResult<FinancePayoutDto>>> GetPayoutsAsync(PagedRequest request, string? status = null, CancellationToken cancellationToken = default)
    {
        var payouts = await BuildPayoutsAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            payouts = payouts.Where(x => x.Status == status).ToList();
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.ToLowerInvariant();
            payouts = payouts.Where(x =>
                x.Id.ToLowerInvariant().Contains(search) ||
                x.InstructorName.ToLowerInvariant().Contains(search) ||
                x.InstructorEmail.ToLowerInvariant().Contains(search) ||
                x.Courses.Any(c => c.Title.ToLowerInvariant().Contains(search))).ToList();
        }

        payouts = request.SortBy?.ToLowerInvariant() switch
        {
            "amount" => request.SortDescending
                ? payouts.OrderByDescending(x => x.NetAmount).ToList()
                : payouts.OrderBy(x => x.NetAmount).ToList(),
            "instructor" => request.SortDescending
                ? payouts.OrderByDescending(x => x.InstructorName).ToList()
                : payouts.OrderBy(x => x.InstructorName).ToList(),
            _ => payouts.OrderByDescending(x => x.PeriodEnd).ToList()
        };

        return Result<PagedResult<FinancePayoutDto>>.Success(Page(payouts, request));
    }

    public async Task<Result<FinancePayoutSummaryDto>> GetPayoutSummaryAsync(CancellationToken cancellationToken = default)
    {
        var payouts = await BuildPayoutsAsync(cancellationToken);
        var currency = await ResolveCurrencyAsync(cancellationToken);

        var pending = payouts.Where(x => x.Status == "pending").ToList();
        var processing = payouts.Where(x => x.Status == "processing").ToList();
        var completed = payouts.Where(x => x.Status == "completed").ToList();
        var onHold = payouts.Where(x => x.Status == "on_hold").ToList();

        return Result<FinancePayoutSummaryDto>.Success(new FinancePayoutSummaryDto
        {
            Currency = currency,
            PendingTotal = pending.Sum(x => x.NetAmount),
            PendingCount = pending.Count,
            ProcessingTotal = processing.Sum(x => x.NetAmount),
            ProcessingCount = processing.Count,
            CompletedTotal = completed.Sum(x => x.NetAmount),
            CompletedCount = completed.Count,
            OnHoldTotal = onHold.Sum(x => x.NetAmount),
            OnHoldCount = onHold.Count,
            UniqueInstructors = payouts.Select(x => x.InstructorId).Distinct().Count()
        });
    }

    public async Task<Result<PagedResult<FinanceInvoiceDto>>> GetInvoicesAsync(PagedRequest request, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Payments
            .Where(x => !x.IsDeleted)
            .Include(x => x.User)
            .Include(x => x.Course)
            .Include(x => x.Organization)
            .Include(x => x.Subscription)
                .ThenInclude(x => x!.Plan)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = status switch
            {
                "open" => query.Where(x => x.Status == PaymentStatus.Pending),
                "paid" => query.Where(x => x.Status == PaymentStatus.Completed),
                "failed" => query.Where(x => x.Status == PaymentStatus.Failed),
                "refunded" => query.Where(x => x.Status == PaymentStatus.Refunded || x.Status == PaymentStatus.PartiallyRefunded),
                _ => query
            };
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.ToLowerInvariant();
            query = query.Where(x =>
                x.User.Email.ToLower().Contains(search) ||
                x.User.FirstName.ToLower().Contains(search) ||
                x.User.LastName.ToLower().Contains(search) ||
                (x.Course != null && x.Course.Title.ToLower().Contains(search)) ||
                (x.Organization != null && x.Organization.Name.ToLower().Contains(search)) ||
                (x.LahzaReference != null && x.LahzaReference.ToLower().Contains(search)));
        }

        query = request.SortBy?.ToLowerInvariant() switch
        {
            "amount" => request.SortDescending
                ? query.OrderByDescending(x => x.Amount)
                : query.OrderBy(x => x.Amount),
            "client" => request.SortDescending
                ? query.OrderByDescending(x => x.User.FirstName)
                : query.OrderBy(x => x.User.FirstName),
            "status" => request.SortDescending
                ? query.OrderByDescending(x => x.Status)
                : query.OrderBy(x => x.Status),
            _ => query.OrderByDescending(x => x.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var payments = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return Result<PagedResult<FinanceInvoiceDto>>.Success(new PagedResult<FinanceInvoiceDto>
        {
            Items = payments.Select(MapInvoice).ToList(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<FinanceInvoiceSummaryDto>> GetInvoiceSummaryAsync(CancellationToken cancellationToken = default)
    {
        var payments = _context.Payments.Where(x => !x.IsDeleted).AsQueryable();
        var since = DateTime.UtcNow.AddDays(-30);
        var currency = await ResolveCurrencyAsync(cancellationToken);

        return Result<FinanceInvoiceSummaryDto>.Success(new FinanceInvoiceSummaryDto
        {
            Currency = currency,
            Outstanding = await payments.Where(x => x.Status == PaymentStatus.Pending).SumAsync(x => x.Amount, cancellationToken),
            CollectedLast30Days = await payments.Where(x => x.Status == PaymentStatus.Completed && (x.PaidAt ?? x.CreatedAt) >= since).SumAsync(x => x.Amount, cancellationToken),
            OpenCount = await payments.CountAsync(x => x.Status == PaymentStatus.Pending, cancellationToken),
            PaidCount = await payments.CountAsync(x => x.Status == PaymentStatus.Completed, cancellationToken)
        });
    }

    private async Task<string> ResolveCurrencyAsync(CancellationToken cancellationToken)
    {
        return await _context.Payments
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.Currency)
            .FirstOrDefaultAsync(cancellationToken) ?? "ILS";
    }

    private async Task<List<FinanceTrendPointDto>> BuildRevenueTrendAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-5);
        var payments = await _context.Payments
            .Where(x => !x.IsDeleted && (x.CreatedAt >= start || x.PaidAt >= start))
            .ToListAsync(cancellationToken);

        return Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var periodStart = start.AddMonths(offset);
                var periodEnd = periodStart.AddMonths(1);
                var bucket = payments.Where(x =>
                {
                    var date = x.PaidAt ?? x.CreatedAt;
                    return date >= periodStart && date < periodEnd;
                }).ToList();

                return new FinanceTrendPointDto
                {
                    Period = periodStart.ToString("MMM"),
                    PeriodStart = periodStart,
                    Revenue = bucket.Where(x => x.Status == PaymentStatus.Completed).Sum(x => x.Amount),
                    PayoutLiability = bucket.Where(x => x.Status == PaymentStatus.Completed).Sum(x => (x.InstructorAmount ?? 0) + (x.OrgAmount ?? 0)),
                    Refunds = bucket.Where(x => x.Status is PaymentStatus.Refunded or PaymentStatus.PartiallyRefunded).Sum(x => x.Amount)
                };
            })
            .ToList();
    }

    private async Task<List<FinanceCategoryDto>> BuildRevenueCategoriesAsync(CancellationToken cancellationToken)
    {
        var rows = await _context.Payments
            .Where(x => !x.IsDeleted && x.Status == PaymentStatus.Completed)
            .GroupBy(x => x.Type)
            .Select(x => new { Type = x.Key, Value = x.Sum(p => p.Amount) })
            .ToListAsync(cancellationToken);

        var colors = new Dictionary<PaymentType, string>
        {
            [PaymentType.CoursePurchase] = "#2563eb",
            [PaymentType.Subscription] = "#16a34a",
            [PaymentType.OrganizationBulkLicense] = "#f59e0b",
            [PaymentType.Refund] = "#dc2626"
        };

        return rows
            .OrderByDescending(x => x.Value)
            .Select(x => new FinanceCategoryDto
            {
                Name = x.Type.ToString(),
                Label = GetPaymentTypeLabel(x.Type),
                Value = x.Value,
                Color = colors.TryGetValue(x.Type, out var color) ? color : "#64748b"
            })
            .ToList();
    }

    private async Task<List<FinanceTopCourseDto>> BuildTopCoursesAsync(CancellationToken cancellationToken)
    {
        var payments = await _context.Payments
            .Include(x => x.Course)
                .ThenInclude(x => x!.Instructor)
            .Where(x => !x.IsDeleted && x.Status == PaymentStatus.Completed && x.Type == PaymentType.CoursePurchase && x.CourseId.HasValue)
            .ToListAsync(cancellationToken);

        var courseIds = payments
            .Where(x => x.CourseId.HasValue)
            .Select(x => x.CourseId!.Value)
            .Distinct()
            .ToList();

        var enrollmentCounts = await _context.Enrollments
            .Where(x => !x.IsDeleted && courseIds.Contains(x.CourseId))
            .GroupBy(x => x.CourseId)
            .Select(x => new { CourseId = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.CourseId, x => x.Count, cancellationToken);

        return payments
            .Where(x => x.Course != null && x.CourseId.HasValue)
            .GroupBy(x => x.CourseId!.Value)
            .Select(group =>
            {
                var first = group.First();
                return new FinanceTopCourseDto
                {
                    CourseId = group.Key,
                    Title = first.Course?.Title ?? "Course",
                    InstructorName = first.Course?.Instructor.FullName.Trim() ?? "Instructor",
                    Revenue = group.Sum(x => x.Amount),
                    Payments = group.Count(),
                    Enrollments = enrollmentCounts.TryGetValue(group.Key, out var count) ? count : 0
                };
            })
            .OrderByDescending(x => x.Revenue)
            .Take(5)
            .ToList();
    }

    private async Task<List<FinancePayoutDto>> BuildPayoutsAsync(CancellationToken cancellationToken)
    {
        var payments = await _context.Payments
            .Include(x => x.Course)
            .Where(x => !x.IsDeleted && x.Status == PaymentStatus.Completed && x.Type == PaymentType.CoursePurchase)
            .ToListAsync(cancellationToken);

        var rows = payments
            .Select(payment => new
            {
                Payment = payment,
                InstructorId = payment.InstructorUserId ?? payment.Course?.InstructorId
            })
            .Where(x => x.InstructorId.HasValue)
            .ToList();

        var instructorIds = rows.Select(x => x.InstructorId!.Value).Distinct().ToList();
        var instructors = await _context.Users
            .Where(x => instructorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        return rows
            .GroupBy(x => x.InstructorId!.Value)
            .Select(group =>
            {
                instructors.TryGetValue(group.Key, out var instructor);
                var paymentRows = group.Select(x => x.Payment).ToList();
                var firstDate = paymentRows.Min(x => x.PaidAt ?? x.CreatedAt);
                var lastDate = paymentRows.Max(x => x.PaidAt ?? x.CreatedAt);
                var name = instructor?.FullName.Trim();
                if (string.IsNullOrWhiteSpace(name)) name = "Instructor";

                var courses = paymentRows
                    .Where(x => x.CourseId.HasValue)
                    .GroupBy(x => x.CourseId!.Value)
                    .Select(courseGroup => new FinancePayoutCourseDto
                    {
                        CourseId = courseGroup.Key,
                        Title = courseGroup.First().Course?.Title ?? "Course",
                        Earnings = courseGroup.Sum(x => x.InstructorAmount ?? x.Amount),
                        Payments = courseGroup.Count()
                    })
                    .OrderByDescending(x => x.Earnings)
                    .ToList();

                return new FinancePayoutDto
                {
                    Id = $"PYT-{group.Key.ToString("N")[..8].ToUpperInvariant()}",
                    InstructorId = group.Key,
                    InstructorName = name,
                    InstructorEmail = instructor?.Email ?? string.Empty,
                    Avatar = GetInitials(name),
                    GrossAmount = paymentRows.Sum(x => x.Amount),
                    PlatformFee = paymentRows.Sum(x => x.PlatformAmount ?? 0),
                    OrganizationShare = paymentRows.Sum(x => x.OrgAmount ?? 0),
                    NetAmount = paymentRows.Sum(x => x.InstructorAmount ?? x.Amount),
                    CourseCount = courses.Count,
                    PaymentCount = paymentRows.Count,
                    Status = "pending",
                    PeriodStart = firstDate,
                    PeriodEnd = lastDate,
                    CreatedAt = lastDate,
                    Courses = courses
                };
            })
            .Where(x => x.NetAmount > 0)
            .OrderByDescending(x => x.PeriodEnd)
            .ToList();
    }

    private static FinanceInvoiceDto MapInvoice(Payment payment)
    {
        var issuedAt = payment.CreatedAt;
        return new FinanceInvoiceDto
        {
            InvoiceNumber = $"INV-{issuedAt:yyyyMMdd}-{payment.Id.ToString("N")[..8].ToUpperInvariant()}",
            PaymentId = payment.Id,
            ClientName = payment.Organization?.Name ?? payment.User.FullName.Trim(),
            ClientEmail = payment.User.Email,
            Item = GetPaymentItem(payment),
            Total = payment.Amount,
            Currency = payment.Currency,
            Status = MapInvoiceStatus(payment.Status),
            IssuedAt = issuedAt,
            DueAt = issuedAt.AddDays(14),
            PaidAt = payment.PaidAt
        };
    }

    private static string GetPaymentItem(Payment payment)
    {
        if (payment.Course != null) return payment.Course.Title;
        if (payment.Subscription?.Plan != null) return $"{payment.Subscription.Plan.Name} subscription";
        if (payment.Organization != null) return $"{payment.Organization.Name} organization license";
        return GetPaymentTypeLabel(payment.Type);
    }

    private static string GetPaymentTypeLabel(PaymentType type) => type switch
    {
        PaymentType.CoursePurchase => "Course sales",
        PaymentType.Subscription => "Subscriptions",
        PaymentType.OrganizationBulkLicense => "Organization licenses",
        PaymentType.Refund => "Refunds",
        _ => type.ToString()
    };

    private static string MapInvoiceStatus(PaymentStatus status) => status switch
    {
        PaymentStatus.Completed => "paid",
        PaymentStatus.Pending => "open",
        PaymentStatus.Failed => "failed",
        PaymentStatus.Refunded or PaymentStatus.PartiallyRefunded => "refunded",
        _ => "open"
    };

    private static string GetInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Concat(parts.Take(2).Select(x => char.ToUpperInvariant(x[0])));
    }

    private static PagedResult<T> Page<T>(IReadOnlyList<T> items, PagedRequest request)
    {
        return new PagedResult<T>
        {
            Items = items
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = items.Count
        };
    }
}
