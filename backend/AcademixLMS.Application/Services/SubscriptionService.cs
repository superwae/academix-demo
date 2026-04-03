using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Subscription;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(
        IApplicationDbContext context,
        ILogger<SubscriptionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<SubscriptionDto>> GetSubscriptionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.User)
            .Include(s => s.Plan)
            .Where(s => s.UserId == userId && !s.IsDeleted && s.Status == SubscriptionStatus.Active)
            .OrderByDescending(s => s.CurrentPeriodEnd)
            .FirstOrDefaultAsync(cancellationToken);

        if (subscription == null)
        {
            return Result<SubscriptionDto>.Failure("No active subscription found.");
        }

        return Result<SubscriptionDto>.Success(MapToSubscriptionDto(subscription));
    }

    public async Task<Result<bool>> CanCreateCourseAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var status = await BuildSubscriptionStatusAsync(userId, cancellationToken);
        return Result<bool>.Success(status.CanCreateCourse);
    }

    public async Task<Result<SubscriptionStatusDto>> GetSubscriptionStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var status = await BuildSubscriptionStatusAsync(userId, cancellationToken);
        return Result<SubscriptionStatusDto>.Success(status);
    }

    public async Task<Result<int>> GetCourseCountForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var count = await _context.Courses
            .CountAsync(c => c.InstructorId == userId && !c.IsDeleted, cancellationToken);

        return Result<int>.Success(count);
    }

    public async Task<Result<SubscriptionDto>> SubscribeAsync(Guid userId, Guid planId, BillingInterval billingInterval, CancellationToken cancellationToken = default)
    {
        // Check if user already has an active subscription
        var existingSubscription = await _context.Subscriptions
            .AnyAsync(s => s.UserId == userId && !s.IsDeleted && s.Status == SubscriptionStatus.Active, cancellationToken);

        if (existingSubscription)
        {
            return Result<SubscriptionDto>.Failure("User already has an active subscription. Cancel it first before subscribing to a new plan.");
        }

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted && p.IsActive, cancellationToken);

        if (plan == null)
        {
            return Result<SubscriptionDto>.Failure("Subscription plan not found or is not active.");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<SubscriptionDto>.Failure("User not found.");
        }

        var now = DateTime.UtcNow;
        var periodEnd = billingInterval == BillingInterval.Monthly
            ? now.AddMonths(1)
            : now.AddYears(1);

        var subscription = new Subscription
        {
            UserId = userId,
            PlanId = planId,
            BillingInterval = billingInterval,
            Status = SubscriptionStatus.Active,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = periodEnd,
            CreatedBy = userId
        };

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync(cancellationToken);

        // Reload with navigation properties
        subscription.User = user;
        subscription.Plan = plan;

        _logger.LogInformation("User {UserId} subscribed to plan '{PlanName}' ({Interval}).", userId, plan.Name, billingInterval);
        return Result<SubscriptionDto>.Success(MapToSubscriptionDto(subscription));
    }

    public async Task<Result> CancelSubscriptionAsync(Guid subscriptionId, Guid userId, CancellationToken cancellationToken = default)
    {
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.UserId == userId && !s.IsDeleted, cancellationToken);

        if (subscription == null)
        {
            return Result.Failure("Subscription not found.");
        }

        if (subscription.Status == SubscriptionStatus.Cancelled)
        {
            return Result.Failure("Subscription is already cancelled.");
        }

        subscription.Status = SubscriptionStatus.Cancelled;
        subscription.CancelledAt = DateTime.UtcNow;
        subscription.UpdatedAt = DateTime.UtcNow;
        subscription.UpdatedBy = userId;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Subscription {SubscriptionId} cancelled by user {UserId}.", subscriptionId, userId);
        return Result.Success();
    }

    public async Task<Result> HandleSubscriptionPaymentAsync(string lahzaReference, CancellationToken cancellationToken = default)
    {
        var payment = await _context.Payments
            .Include(p => p.Subscription)
            .FirstOrDefaultAsync(p => p.LahzaReference == lahzaReference && !p.IsDeleted, cancellationToken);

        if (payment == null)
        {
            return Result.Failure("Payment not found for the given reference.");
        }

        if (payment.Status == PaymentStatus.Completed)
        {
            return Result.Success(); // Already processed (idempotent)
        }

        payment.Status = PaymentStatus.Completed;
        payment.PaidAt = DateTime.UtcNow;
        payment.UpdatedAt = DateTime.UtcNow;

        // Extend the subscription period if this is a renewal
        if (payment.Subscription != null)
        {
            var subscription = payment.Subscription;
            var now = DateTime.UtcNow;
            var periodStart = subscription.CurrentPeriodEnd > now ? subscription.CurrentPeriodEnd : now;
            var periodEnd = subscription.BillingInterval == BillingInterval.Monthly
                ? periodStart.AddMonths(1)
                : periodStart.AddYears(1);

            subscription.CurrentPeriodStart = periodStart;
            subscription.CurrentPeriodEnd = periodEnd;
            subscription.Status = SubscriptionStatus.Active;
            subscription.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Subscription payment processed for Lahza reference '{Reference}'.", lahzaReference);
        return Result.Success();
    }

    private async Task<SubscriptionStatusDto> BuildSubscriptionStatusAsync(Guid userId, CancellationToken cancellationToken)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.UserId == userId && !s.IsDeleted && s.Status == SubscriptionStatus.Active)
            .OrderByDescending(s => s.CurrentPeriodEnd)
            .FirstOrDefaultAsync(cancellationToken);

        var courseCount = await _context.Courses
            .CountAsync(c => c.InstructorId == userId && !c.IsDeleted, cancellationToken);

        if (subscription == null)
        {
            return new SubscriptionStatusDto
            {
                HasActiveSubscription = false,
                CurrentCourseCount = courseCount,
                CanCreateCourse = false
            };
        }

        var maxCourses = subscription.Plan.MaxCourses;
        var canCreate = !maxCourses.HasValue || courseCount < maxCourses.Value;

        return new SubscriptionStatusDto
        {
            HasActiveSubscription = true,
            PlanName = subscription.Plan.Name,
            MaxCourses = maxCourses,
            CurrentCourseCount = courseCount,
            CanCreateCourse = canCreate,
            RemainingCourses = maxCourses.HasValue ? Math.Max(0, maxCourses.Value - courseCount) : null
        };
    }

    private static SubscriptionDto MapToSubscriptionDto(Subscription subscription) => new()
    {
        Id = subscription.Id,
        UserId = subscription.UserId,
        UserName = subscription.User.FullName,
        PlanId = subscription.PlanId,
        PlanName = subscription.Plan.Name,
        BillingInterval = subscription.BillingInterval.ToString(),
        Status = subscription.Status.ToString(),
        CurrentPeriodStart = subscription.CurrentPeriodStart,
        CurrentPeriodEnd = subscription.CurrentPeriodEnd,
        CancelledAt = subscription.CancelledAt,
        TrialEndsAt = subscription.TrialEndsAt,
        CreatedAt = subscription.CreatedAt,
        Plan = new SubscriptionPlanDto
        {
            Id = subscription.Plan.Id,
            Name = subscription.Plan.Name,
            Description = subscription.Plan.Description,
            MonthlyPrice = subscription.Plan.MonthlyPrice,
            YearlyPrice = subscription.Plan.YearlyPrice,
            MaxCourses = subscription.Plan.MaxCourses,
            MaxSeatsPerCourse = subscription.Plan.MaxSeatsPerCourse,
            MaxTotalSeats = subscription.Plan.MaxTotalSeats,
            FeaturesJson = subscription.Plan.FeaturesJson,
            IsActive = subscription.Plan.IsActive,
            SortOrder = subscription.Plan.SortOrder,
        }
    };
}
