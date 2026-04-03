using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IApplicationDbContext _context;
    private readonly ILahzaService _lahzaService;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        IApplicationDbContext context,
        ILahzaService lahzaService,
        ILogger<PaymentService> logger)
    {
        _context = context;
        _lahzaService = lahzaService;
        _logger = logger;
    }

    public async Task<Result<InitializePaymentResponse>> InitializeCoursePaymentAsync(Guid userId, Guid courseId, string? discountCode = null, CancellationToken cancellationToken = default)
    {
        // 1. Check if user already paid for this course
        var alreadyPaid = await _context.Payments
            .AnyAsync(p => p.UserId == userId && p.CourseId == courseId && p.Status == PaymentStatus.Completed && !p.IsDeleted, cancellationToken);

        if (alreadyPaid)
        {
            return Result<InitializePaymentResponse>.Failure("You have already paid for this course.");
        }

        // Load course
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<InitializePaymentResponse>.Failure("Course not found.");
        }

        if (!course.Price.HasValue || course.Price.Value <= 0)
        {
            return Result<InitializePaymentResponse>.Failure("This course is free and does not require payment.");
        }

        // Load user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<InitializePaymentResponse>.Failure("User not found.");
        }

        // Convert price to smallest currency unit (e.g. cents)
        var originalAmount = (long)(course.Price.Value * 100);
        var finalAmount = originalAmount;
        Guid? discountId = null;

        // 2. Apply discount if code provided
        if (!string.IsNullOrWhiteSpace(discountCode))
        {
            var discount = await _context.Discounts
                .FirstOrDefaultAsync(d =>
                    d.CourseId == courseId &&
                    d.Code == discountCode &&
                    d.IsActive &&
                    !d.IsDeleted, cancellationToken);

            if (discount != null && IsDiscountValid(discount))
            {
                discountId = discount.Id;

                if (discount.Type == DiscountType.Percentage)
                {
                    finalAmount = originalAmount - (long)(originalAmount * discount.Value / 100m);
                }
                else // FixedAmount
                {
                    finalAmount = Math.Max(0, originalAmount - (long)discount.Value);
                }

                // Increment usage count
                discount.UsedCount++;
                discount.UpdatedAt = DateTime.UtcNow;
            }
        }

        // 3. Create Payment record with Pending status
        var payment = new Payment
        {
            UserId = userId,
            Type = PaymentType.CoursePurchase,
            Status = PaymentStatus.Pending,
            Amount = finalAmount,
            Currency = "ILS",
            CourseId = courseId,
            DiscountId = discountId,
            OriginalAmount = discountId.HasValue ? originalAmount : null,
            CreatedBy = userId
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync(cancellationToken);

        // 4. Call Lahza initialize
        var lahzaRequest = new LahzaInitializeRequest
        {
            Email = user.Email,
            Mobile = user.PhoneNumber,
            Amount = finalAmount,
            Currency = payment.Currency,
            Reference = payment.Id.ToString(),
            Metadata = new Dictionary<string, string>
            {
                { "payment_id", payment.Id.ToString() },
                { "course_id", courseId.ToString() },
                { "user_id", userId.ToString() }
            }
        };

        var lahzaResult = await _lahzaService.InitializeTransactionAsync(lahzaRequest, cancellationToken);
        if (!lahzaResult.IsSuccess)
        {
            // Mark payment as failed
            payment.Status = PaymentStatus.Failed;
            payment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogWarning("Lahza initialization failed for payment {PaymentId}: {Error}", payment.Id, lahzaResult.Error);
            return Result<InitializePaymentResponse>.Failure($"Payment initialization failed: {lahzaResult.Error}");
        }

        // 5. Save LahzaReference on Payment
        payment.LahzaReference = lahzaResult.Value!.Reference;
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Course payment initialized for user {UserId}, course {CourseId}, amount {Amount}.", userId, courseId, finalAmount);

        // 6. Return authorization URL
        return Result<InitializePaymentResponse>.Success(new InitializePaymentResponse
        {
            PaymentId = payment.Id,
            AuthorizationUrl = lahzaResult.Value!.AuthorizationUrl,
            Reference = lahzaResult.Value!.Reference
        });
    }

    public async Task<Result<PaymentDto>> VerifyPaymentAsync(string lahzaReference, CancellationToken cancellationToken = default)
    {
        var payment = await _context.Payments
            .Include(p => p.User)
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.LahzaReference == lahzaReference && !p.IsDeleted, cancellationToken);

        if (payment == null)
        {
            return Result<PaymentDto>.Failure("Payment not found for the given reference.");
        }

        if (payment.Status == PaymentStatus.Completed)
        {
            return Result<PaymentDto>.Success(MapToPaymentDto(payment));
        }

        var verifyResult = await _lahzaService.VerifyTransactionAsync(lahzaReference, cancellationToken);
        if (!verifyResult.IsSuccess)
        {
            _logger.LogWarning("Lahza verification failed for reference '{Reference}': {Error}", lahzaReference, verifyResult.Error);
            return Result<PaymentDto>.Failure($"Payment verification failed: {verifyResult.Error}");
        }

        var verification = verifyResult.Value!;

        if (verification.Status == "success")
        {
            payment.Status = PaymentStatus.Completed;
            payment.PaidAt = verification.PaidAt ?? DateTime.UtcNow;
            payment.LahzaAuthorizationCode = verification.AuthorizationCode;
            payment.LahzaChannel = verification.Channel;
        }
        else
        {
            payment.Status = PaymentStatus.Failed;
        }

        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Payment {PaymentId} verified with status '{Status}'.", payment.Id, payment.Status);
        return Result<PaymentDto>.Success(MapToPaymentDto(payment));
    }

    public async Task<Result<PagedResult<PaymentDto>>> GetPaymentsByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Payments
            .Include(p => p.User)
            .Include(p => p.Course)
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(p =>
                (p.Course != null && p.Course.Title.ToLower().Contains(searchTerm)) ||
                (p.LahzaReference != null && p.LahzaReference.ToLower().Contains(searchTerm)));
        }

        query = request.SortBy?.ToLower() switch
        {
            "amount" => request.SortDescending
                ? query.OrderByDescending(p => p.Amount)
                : query.OrderBy(p => p.Amount),
            "status" => request.SortDescending
                ? query.OrderByDescending(p => p.Status)
                : query.OrderBy(p => p.Status),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var result = new PagedResult<PaymentDto>
        {
            Items = items.Select(MapToPaymentDto).ToList(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };

        return Result<PagedResult<PaymentDto>>.Success(result);
    }

    public async Task<Result<PagedResult<PaymentListDto>>> GetAllPaymentsAsync(PagedRequest request, PaymentFilterRequest? filters = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Payments
            .Include(p => p.User)
            .Include(p => p.Course)
            .Where(p => !p.IsDeleted)
            .AsQueryable();

        // Apply filters
        if (filters != null)
        {
            if (!string.IsNullOrWhiteSpace(filters.Type) && Enum.TryParse<PaymentType>(filters.Type, true, out var paymentType))
            {
                query = query.Where(p => p.Type == paymentType);
            }
            if (!string.IsNullOrWhiteSpace(filters.Status) && Enum.TryParse<PaymentStatus>(filters.Status, true, out var paymentStatus))
            {
                query = query.Where(p => p.Status == paymentStatus);
            }
            if (filters.FromDate.HasValue)
            {
                query = query.Where(p => p.CreatedAt >= filters.FromDate.Value);
            }
            if (filters.ToDate.HasValue)
            {
                query = query.Where(p => p.CreatedAt <= filters.ToDate.Value);
            }
            if (filters.UserId.HasValue)
            {
                query = query.Where(p => p.UserId == filters.UserId.Value);
            }
            if (filters.CourseId.HasValue)
            {
                query = query.Where(p => p.CourseId == filters.CourseId.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(p =>
                p.User.Email.ToLower().Contains(searchTerm) ||
                p.User.FirstName.ToLower().Contains(searchTerm) ||
                p.User.LastName.ToLower().Contains(searchTerm) ||
                (p.Course != null && p.Course.Title.ToLower().Contains(searchTerm)) ||
                (p.LahzaReference != null && p.LahzaReference.ToLower().Contains(searchTerm)));
        }

        query = request.SortBy?.ToLower() switch
        {
            "amount" => request.SortDescending
                ? query.OrderByDescending(p => p.Amount)
                : query.OrderBy(p => p.Amount),
            "user" => request.SortDescending
                ? query.OrderByDescending(p => p.User.FirstName)
                : query.OrderBy(p => p.User.FirstName),
            "status" => request.SortDescending
                ? query.OrderByDescending(p => p.Status)
                : query.OrderBy(p => p.Status),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var result = new PagedResult<PaymentListDto>
        {
            Items = items.Select(MapToPaymentListDto).ToList(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };

        return Result<PagedResult<PaymentListDto>>.Success(result);
    }

    public async Task<Result<PaymentSummaryDto>> GetPaymentSummaryAsync(CancellationToken cancellationToken = default)
    {
        var payments = _context.Payments.Where(p => !p.IsDeleted);

        var now = DateTime.UtcNow;
        var startOfThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfLastMonth = startOfThisMonth.AddMonths(-1);

        var totalRevenue = await payments
            .Where(p => p.Status == PaymentStatus.Completed)
            .SumAsync(p => p.Amount, cancellationToken);

        var totalPayments = await payments.CountAsync(cancellationToken);

        var completedPayments = await payments
            .CountAsync(p => p.Status == PaymentStatus.Completed, cancellationToken);

        var pendingPayments = await payments
            .CountAsync(p => p.Status == PaymentStatus.Pending, cancellationToken);

        var failedPayments = await payments
            .CountAsync(p => p.Status == PaymentStatus.Failed, cancellationToken);

        var refundedPayments = await payments
            .CountAsync(p => p.Status == PaymentStatus.Refunded || p.Status == PaymentStatus.PartiallyRefunded, cancellationToken);

        var revenueThisMonth = await payments
            .Where(p => p.Status == PaymentStatus.Completed && p.PaidAt >= startOfThisMonth)
            .SumAsync(p => p.Amount, cancellationToken);

        var revenueLastMonth = await payments
            .Where(p => p.Status == PaymentStatus.Completed && p.PaidAt >= startOfLastMonth && p.PaidAt < startOfThisMonth)
            .SumAsync(p => p.Amount, cancellationToken);

        var summary = new PaymentSummaryDto
        {
            TotalRevenue = totalRevenue,
            Currency = "ILS",
            TotalPayments = totalPayments,
            CompletedPayments = completedPayments,
            PendingPayments = pendingPayments,
            FailedPayments = failedPayments,
            RefundedPayments = refundedPayments,
            RevenueThisMonth = revenueThisMonth,
            RevenueLastMonth = revenueLastMonth
        };

        return Result<PaymentSummaryDto>.Success(summary);
    }

    public async Task<Result<bool>> HasUserPaidForCourseAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var hasPaid = await _context.Payments
            .AnyAsync(p => p.UserId == userId && p.CourseId == courseId && p.Status == PaymentStatus.Completed && !p.IsDeleted, cancellationToken);

        return Result<bool>.Success(hasPaid);
    }

    private static bool IsDiscountValid(Discount discount)
    {
        if (!discount.IsActive) return false;
        if (discount.StartsAt.HasValue && DateTime.UtcNow < discount.StartsAt.Value) return false;
        if (discount.ExpiresAt.HasValue && DateTime.UtcNow > discount.ExpiresAt.Value) return false;
        if (discount.MaxUses.HasValue && discount.UsedCount >= discount.MaxUses.Value) return false;
        return true;
    }

    private static PaymentDto MapToPaymentDto(Payment payment) => new()
    {
        Id = payment.Id,
        UserId = payment.UserId,
        UserName = payment.User.FullName,
        UserEmail = payment.User.Email,
        Type = payment.Type.ToString(),
        Status = payment.Status.ToString(),
        Amount = payment.Amount,
        Currency = payment.Currency,
        LahzaReference = payment.LahzaReference,
        LahzaChannel = payment.LahzaChannel,
        PaidAt = payment.PaidAt,
        CourseId = payment.CourseId,
        CourseTitle = payment.Course?.Title,
        SubscriptionId = payment.SubscriptionId,
        DiscountId = payment.DiscountId,
        OriginalAmount = payment.OriginalAmount,
        CreatedAt = payment.CreatedAt
    };

    private static PaymentListDto MapToPaymentListDto(Payment payment) => new()
    {
        Id = payment.Id,
        UserName = payment.User.FullName,
        UserEmail = payment.User.Email,
        Type = payment.Type.ToString(),
        Status = payment.Status.ToString(),
        Amount = payment.Amount,
        Currency = payment.Currency,
        CourseTitle = payment.Course?.Title,
        LahzaReference = payment.LahzaReference,
        PaidAt = payment.PaidAt,
        CreatedAt = payment.CreatedAt
    };
}
