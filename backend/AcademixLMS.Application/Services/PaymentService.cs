using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IApplicationDbContext _context;
    private readonly ILahzaService _lahzaService;
    private readonly IRevenueSplitService _revenueSplitService;
    private readonly IEnrollmentService _enrollmentService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentService> _logger;
    private readonly IStringLocalizer<PaymentService> _localizer;

    public PaymentService(
        IApplicationDbContext context,
        ILahzaService lahzaService,
        IRevenueSplitService revenueSplitService,
        IEnrollmentService enrollmentService,
        IConfiguration configuration,
        ILogger<PaymentService> logger,
        IStringLocalizer<PaymentService> localizer)
    {
        _context = context;
        _lahzaService = lahzaService;
        _revenueSplitService = revenueSplitService;
        _enrollmentService = enrollmentService;
        _configuration = configuration;
        _logger = logger;
        _localizer = localizer;
    }

    /// <summary>Payments:DemoMode — completes payments instantly without the Lahza gateway.</summary>
    private bool IsDemoMode =>
        bool.TryParse(_configuration["Payments:DemoMode"], out var demoMode) && demoMode;

    public async Task<Result<InitializePaymentResponse>> InitializeCoursePaymentAsync(Guid userId, Guid courseId, string? discountCode = null, Guid? sectionId = null, CancellationToken cancellationToken = default)
    {
        // 1. Check if user already paid for this course
        var alreadyPaid = await _context.Payments
            .AnyAsync(p => p.UserId == userId && p.CourseId == courseId && p.Status == PaymentStatus.Completed && !p.IsDeleted, cancellationToken);

        if (alreadyPaid)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["AlreadyPaid"]);
        }

        // Load course
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["CourseNotFound"]);
        }

        if (!course.Price.HasValue || course.Price.Value <= 0)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["CourseIsFree"]);
        }

        // Validate the chosen section up-front so we never take money for an invalid section.
        if (sectionId.HasValue)
        {
            var sectionValid = await _context.CourseSections
                .AnyAsync(s => s.Id == sectionId.Value && s.CourseId == courseId && s.IsActive && !s.IsDeleted, cancellationToken);
            if (!sectionValid)
            {
                return Result<InitializePaymentResponse>.Failure(_localizer["SectionNotFound"]);
            }
        }

        // Load user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["UserNotFound"]);
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
                else // FixedAmount — value is in dollars, convert to cents
                {
                    finalAmount = Math.Max(0, originalAmount - (long)(discount.Value * 100));
                }

                // Note: UsedCount is incremented only when the payment actually completes
                // (instant local completion below, or gateway verification) so abandoned checkouts
                // can't exhaust a discount's MaxUses.
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

        // 3b. Local instant mode: complete the payment instantly and enroll — no gateway round-trip.
        if (IsDemoMode)
        {
            payment.Status = PaymentStatus.Completed;
            payment.PaidAt = DateTime.UtcNow;
            payment.LahzaReference = $"local_{payment.Id:N}";
            payment.LahzaChannel = "local";

            await ApplyRevenueSplitAsync(payment, cancellationToken);
            await ConsumeDiscountAsync(payment.DiscountId, cancellationToken);

            payment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            var enrollResult = await _enrollmentService.EnrollAfterPaymentAsync(userId, courseId, payment.Id, sectionId, cancellationToken);
            if (!enrollResult.IsSuccess)
            {
                _logger.LogWarning("Instant course payment {PaymentId} completed but auto-enrollment failed: {Error}", payment.Id, enrollResult.Error);
            }

            _logger.LogInformation("Instant course payment {PaymentId} completed for user {UserId}, course {CourseId}, amount {Amount}.", payment.Id, userId, courseId, finalAmount);

            return Result<InitializePaymentResponse>.Success(new InitializePaymentResponse
            {
                PaymentId = payment.Id,
                AuthorizationUrl = string.Empty,
                Reference = payment.LahzaReference,
                DemoCompleted = true
            });
        }

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
                { "user_id", userId.ToString() },
                { "section_id", sectionId?.ToString() ?? string.Empty }
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
            return Result<InitializePaymentResponse>.Failure(_localizer["PaymentInitFailed", lahzaResult.Error ?? string.Empty]);
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

    public async Task<Result<InitializePaymentResponse>> InitializeSubscriptionPaymentAsync(Guid userId, Guid planId, string billingInterval, CancellationToken cancellationToken = default)
    {
        // Check user does not already have an active subscription
        var existing = await _context.Subscriptions
            .AnyAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active && !s.IsDeleted, cancellationToken);

        if (existing)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["AlreadyHasActiveSubscription"]);
        }

        // Load plan
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == planId && p.IsActive && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["SubscriptionPlanNotFound"]);
        }

        // Parse billing interval (case-insensitive)
        if (!Enum.TryParse<BillingInterval>(billingInterval, true, out var interval))
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["InvalidBillingInterval"]);
        }

        // Determine price based on interval
        var price = interval == BillingInterval.Monthly ? plan.MonthlyPrice : plan.YearlyPrice;
        if (price <= 0)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["PlanHasNoPrice"]);
        }

        // Load user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<InitializePaymentResponse>.Failure(_localizer["UserNotFound"]);
        }

        var amountInSmallestUnit = (long)(price * 100);

        // Create Payment record (no SubscriptionId yet — created on verify)
        var payment = new Payment
        {
            UserId = userId,
            Type = PaymentType.Subscription,
            Status = PaymentStatus.Pending,
            Amount = amountInSmallestUnit,
            Currency = "ILS",
            CreatedBy = userId
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync(cancellationToken);

        // Local instant mode: activate the subscription instantly — no gateway round-trip.
        if (IsDemoMode)
        {
            var now = DateTime.UtcNow;
            var subscription = new Subscription
            {
                UserId = userId,
                PlanId = planId,
                BillingInterval = interval,
                Status = SubscriptionStatus.Active,
                CurrentPeriodStart = now,
                CurrentPeriodEnd = interval == BillingInterval.Monthly ? now.AddMonths(1) : now.AddYears(1),
                CreatedBy = userId
            };
            _context.Subscriptions.Add(subscription);
            await _context.SaveChangesAsync(cancellationToken);

            payment.Status = PaymentStatus.Completed;
            payment.PaidAt = now;
            payment.LahzaReference = $"local_{payment.Id:N}";
            payment.LahzaChannel = "local";
            payment.SubscriptionId = subscription.Id;
            payment.UpdatedAt = now;
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Instant subscription payment {PaymentId} completed for user {UserId}, plan {PlanId}; subscription {SubscriptionId} active.", payment.Id, userId, planId, subscription.Id);

            return Result<InitializePaymentResponse>.Success(new InitializePaymentResponse
            {
                PaymentId = payment.Id,
                AuthorizationUrl = string.Empty,
                Reference = payment.LahzaReference,
                DemoCompleted = true
            });
        }

        // Call Lahza
        var lahzaRequest = new LahzaInitializeRequest
        {
            Email = user.Email,
            Mobile = user.PhoneNumber,
            Amount = amountInSmallestUnit,
            Currency = payment.Currency,
            Reference = payment.Id.ToString(),
            Metadata = new Dictionary<string, string>
            {
                { "payment_id", payment.Id.ToString() },
                { "plan_id", planId.ToString() },
                { "billing_interval", interval.ToString() },
                { "user_id", userId.ToString() }
            }
        };

        var lahzaResult = await _lahzaService.InitializeTransactionAsync(lahzaRequest, cancellationToken);
        if (!lahzaResult.IsSuccess)
        {
            payment.Status = PaymentStatus.Failed;
            payment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogWarning("Lahza initialization failed for subscription payment {PaymentId}: {Error}", payment.Id, lahzaResult.Error);
            return Result<InitializePaymentResponse>.Failure(_localizer["PaymentInitFailed", lahzaResult.Error ?? string.Empty]);
        }

        payment.LahzaReference = lahzaResult.Value!.Reference;
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Subscription payment initialized for user {UserId}, plan {PlanId}, amount {Amount}.", userId, planId, amountInSmallestUnit);

        return Result<InitializePaymentResponse>.Success(new InitializePaymentResponse
        {
            PaymentId = payment.Id,
            AuthorizationUrl = lahzaResult.Value!.AuthorizationUrl,
            Reference = lahzaResult.Value!.Reference
        });
    }

    public async Task<Result<PaymentDto>> VerifyPaymentAsync(string lahzaReference, Guid? requestingUserId = null, CancellationToken cancellationToken = default)
    {
        var payment = await _context.Payments
            .Include(p => p.User)
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.LahzaReference == lahzaReference && !p.IsDeleted, cancellationToken);

        if (payment == null)
        {
            return Result<PaymentDto>.Failure(_localizer["PaymentNotFound"]);
        }

        // Scope to the requesting user: never confirm (or act on) someone else's payment.
        if (requestingUserId.HasValue && payment.UserId != requestingUserId.Value)
        {
            return Result<PaymentDto>.Failure(_localizer["PaymentNotFound"]);
        }

        if (payment.Status == PaymentStatus.Completed)
        {
            return Result<PaymentDto>.Success(MapToPaymentDto(payment));
        }

        var verifyResult = await _lahzaService.VerifyTransactionAsync(lahzaReference, cancellationToken);
        if (!verifyResult.IsSuccess)
        {
            _logger.LogWarning("Lahza verification failed for reference '{Reference}': {Error}", lahzaReference, verifyResult.Error);
            return Result<PaymentDto>.Failure(_localizer["PaymentVerificationFailed", verifyResult.Error ?? string.Empty]);
        }

        var verification = verifyResult.Value!;
        Guid? checkoutSectionId = null;

        if (verification.Status == "success")
        {
            payment.Status = PaymentStatus.Completed;
            payment.PaidAt = verification.PaidAt ?? DateTime.UtcNow;
            payment.LahzaAuthorizationCode = verification.AuthorizationCode;
            payment.LahzaChannel = verification.Channel;

            // Section the buyer chose at checkout, carried through gateway metadata.
            if (verification.Metadata != null &&
                verification.Metadata.TryGetValue("section_id", out var sectionIdStr) &&
                Guid.TryParse(sectionIdStr, out var parsedSectionId))
            {
                checkoutSectionId = parsedSectionId;
            }

            // Persist revenue split snapshot for course purchases.
            await ApplyRevenueSplitAsync(payment, cancellationToken);

            // Count discount usage only on confirmed completion.
            await ConsumeDiscountAsync(payment.DiscountId, cancellationToken);

            // If this is a subscription payment, create the subscription record
            if (payment.Type == PaymentType.Subscription && verification.Metadata != null)
            {
                if (verification.Metadata.TryGetValue("plan_id", out var planIdStr) &&
                    Guid.TryParse(planIdStr, out var planId) &&
                    verification.Metadata.TryGetValue("billing_interval", out var intervalStr) &&
                    Enum.TryParse<BillingInterval>(intervalStr, out var interval))
                {
                    var now = DateTime.UtcNow;
                    var subscription = new Subscription
                    {
                        UserId = payment.UserId,
                        PlanId = planId,
                        BillingInterval = interval,
                        Status = SubscriptionStatus.Active,
                        CurrentPeriodStart = now,
                        CurrentPeriodEnd = interval == BillingInterval.Monthly ? now.AddMonths(1) : now.AddYears(1),
                        CreatedBy = payment.UserId
                    };
                    _context.Subscriptions.Add(subscription);
                    await _context.SaveChangesAsync(cancellationToken);

                    payment.SubscriptionId = subscription.Id;
                    _logger.LogInformation("Subscription {SubscriptionId} created from payment {PaymentId}", subscription.Id, payment.Id);
                }
            }
        }
        else
        {
            payment.Status = PaymentStatus.Failed;
        }

        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Payment {PaymentId} verified with status '{Status}'.", payment.Id, payment.Status);
        var dto = MapToPaymentDto(payment);
        dto.SectionId = checkoutSectionId;
        return Result<PaymentDto>.Success(dto);
    }

    /// <summary>Computes and stores the platform/org/instructor revenue split on a completed course purchase.</summary>
    private async Task ApplyRevenueSplitAsync(Payment payment, CancellationToken cancellationToken)
    {
        if (payment.Type != PaymentType.CoursePurchase || payment.CourseId is not { } courseId)
            return;

        var splitResult = await _revenueSplitService.ComputeForPaymentAsync(courseId, payment.Amount, cancellationToken);
        if (splitResult.IsSuccess)
        {
            var (platformAmt, orgAmt, instructorAmt) = splitResult.Value;
            payment.PlatformAmount = platformAmt;
            payment.OrgAmount = orgAmt;
            payment.InstructorAmount = instructorAmt;

            var course = payment.Course ?? await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);
            payment.InstructorUserId = course?.InstructorId;
            payment.OrganizationId = course?.OrganizationId;
        }
    }

    /// <summary>Increments a discount's usage count. Called only when a payment actually completes.</summary>
    private async Task ConsumeDiscountAsync(Guid? discountId, CancellationToken cancellationToken)
    {
        if (!discountId.HasValue)
            return;

        var discount = await _context.Discounts
            .FirstOrDefaultAsync(d => d.Id == discountId.Value && !d.IsDeleted, cancellationToken);
        if (discount != null)
        {
            discount.UsedCount++;
            discount.UpdatedAt = DateTime.UtcNow;
        }
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
