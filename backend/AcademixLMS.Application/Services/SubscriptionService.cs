using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Subscription;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SubscriptionService> _logger;
    private readonly IStringLocalizer<SubscriptionService> _localizer;

    public SubscriptionService(
        IApplicationDbContext context,
        IConfiguration configuration,
        ILogger<SubscriptionService> logger,
        IStringLocalizer<SubscriptionService> localizer)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _localizer = localizer;
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
            return Result<SubscriptionDto>.Failure(_localizer["NoActiveSubscription"]);
        }

        return Result<SubscriptionDto>.Success(MapToSubscriptionDto(subscription));
    }

    public async Task<Result<bool>> CanCreateCourseAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var status = await BuildSubscriptionStatusAsync(userId, organizationId: null, forcePersonal: false, cancellationToken);
        return Result<bool>.Success(status.CanCreateCourse);
    }

    public async Task<Result<SubscriptionStatusDto>> GetSubscriptionStatusAsync(
        Guid userId,
        Guid? organizationId = null,
        bool forcePersonal = false,
        CancellationToken cancellationToken = default)
    {
        var status = await BuildSubscriptionStatusAsync(userId, organizationId, forcePersonal, cancellationToken);
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
            return Result<SubscriptionDto>.Failure(_localizer["AlreadyHasActiveSubscription"]);
        }

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted && p.IsActive, cancellationToken);

        if (plan == null)
        {
            return Result<SubscriptionDto>.Failure(_localizer["PlanNotFound"]);
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result<SubscriptionDto>.Failure(_localizer["UserNotFound"]);
        }

        // Paid plans must go through the payment flow (POST /payments/initialize/subscription).
        // This direct endpoint only activates free plans — or any plan when demo mode is on.
        var price = billingInterval == BillingInterval.Monthly ? plan.MonthlyPrice : plan.YearlyPrice;
        var demoMode = bool.TryParse(_configuration["Payments:DemoMode"], out var dm) && dm;
        if (price > 0 && !demoMode)
        {
            return Result<SubscriptionDto>.Failure(_localizer["SubscriptionRequiresPayment"]);
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

    public async Task<Result<SubscriptionDto>> SubscribeOrganizationAsync(
        Guid requestingUserId,
        Guid organizationId,
        Guid planId,
        BillingInterval billingInterval,
        CancellationToken cancellationToken = default)
    {
        var organization = await _context.Organizations
            .Include(o => o.Owner)
            .FirstOrDefaultAsync(o => o.Id == organizationId && !o.IsDeleted, cancellationToken);

        if (organization == null)
            return Result<SubscriptionDto>.Failure("Organization not found.");

        var isOrgAdmin = await _context.OrganizationMembers.AnyAsync(m =>
            m.OrganizationId == organizationId &&
            m.UserId == requestingUserId &&
            m.IsActive &&
            !m.IsDeleted &&
            m.Role == OrgMemberRole.OrgAdmin,
            cancellationToken);

        var isPlatformAdmin = await _context.UserRoles
            .Include(ur => ur.Role)
            .AnyAsync(ur =>
                ur.UserId == requestingUserId &&
                !ur.IsDeleted &&
                !ur.Role.IsDeleted &&
                (ur.Role.Name == "Admin" || ur.Role.Name == "SuperAdmin"),
                cancellationToken);

        if (!isOrgAdmin && !isPlatformAdmin)
            return Result<SubscriptionDto>.Failure("Only organization admins can manage this organization's subscription.");

        if (organization.SubscriptionId.HasValue)
        {
            var activeExisting = await _context.Subscriptions.AnyAsync(s =>
                s.Id == organization.SubscriptionId.Value &&
                s.Status == SubscriptionStatus.Active &&
                !s.IsDeleted,
                cancellationToken);

            if (activeExisting)
                return Result<SubscriptionDto>.Failure("Organization already has an active subscription.");
        }

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted && p.IsActive, cancellationToken);

        if (plan == null)
            return Result<SubscriptionDto>.Failure(_localizer["PlanNotFound"]);

        var owner = organization.Owner ?? await _context.Users
            .FirstOrDefaultAsync(u => u.Id == organization.OwnerUserId && !u.IsDeleted, cancellationToken);

        if (owner == null)
            return Result<SubscriptionDto>.Failure("Organization owner not found.");

        var now = DateTime.UtcNow;
        var subscription = new Subscription
        {
            UserId = owner.Id,
            PlanId = plan.Id,
            BillingInterval = billingInterval,
            Status = SubscriptionStatus.Active,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = billingInterval == BillingInterval.Monthly ? now.AddMonths(1) : now.AddYears(1),
            CreatedBy = requestingUserId
        };

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync(cancellationToken);

        organization.SubscriptionId = subscription.Id;
        organization.UpdatedAt = DateTime.UtcNow;
        organization.UpdatedBy = requestingUserId;
        await _context.SaveChangesAsync(cancellationToken);

        subscription.User = owner;
        subscription.Plan = plan;

        _logger.LogInformation(
            "Organization {OrganizationId} subscribed to plan '{PlanName}' by user {UserId}.",
            organizationId,
            plan.Name,
            requestingUserId);

        return Result<SubscriptionDto>.Success(MapToSubscriptionDto(subscription));
    }

    public async Task<Result> CancelSubscriptionAsync(Guid subscriptionId, Guid userId, CancellationToken cancellationToken = default)
    {
        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.UserId == userId && !s.IsDeleted, cancellationToken);

        if (subscription == null)
        {
            return Result.Failure(_localizer["SubscriptionNotFound"]);
        }

        if (subscription.Status == SubscriptionStatus.Cancelled)
        {
            return Result.Failure(_localizer["AlreadyCancelled"]);
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
            return Result.Failure(_localizer["PaymentNotFound"]);
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

    private async Task<SubscriptionStatusDto> BuildSubscriptionStatusAsync(
        Guid userId,
        Guid? organizationId,
        bool forcePersonal,
        CancellationToken cancellationToken)
    {
        if (organizationId.HasValue && !forcePersonal)
        {
            var orgMembership = await _context.OrganizationMembers
                .Include(m => m.Organization)
                .FirstOrDefaultAsync(m =>
                    m.OrganizationId == organizationId.Value &&
                    m.UserId == userId && m.IsActive && !m.IsDeleted &&
                    (m.Role == OrgMemberRole.OrgTeacher || m.Role == OrgMemberRole.OrgAdmin),
                    cancellationToken);

            if (orgMembership is not null)
            {
                return await BuildOrganizationSubscriptionStatusAsync(
                    orgMembership.Organization,
                    orgMembership.OrganizationId,
                    cancellationToken);
            }
        }

        // If the user is an active OrgTeacher under a Teaching Institution, the org's subscription
        // drives course capacity — not the teacher's personal plan. The quota is shared across every
        // OrgTeacher in the institution (pooled).
        var orgTeacherMembership = forcePersonal
            ? null
            : await _context.OrganizationMembers
                .Include(m => m.Organization)
                .FirstOrDefaultAsync(m =>
                    m.UserId == userId && m.IsActive && !m.IsDeleted &&
                    m.Role == OrgMemberRole.OrgTeacher &&
                    m.Organization.Type == OrganizationType.TeachingInstitution,
                    cancellationToken);

        if (orgTeacherMembership is not null)
        {
            return await BuildOrganizationSubscriptionStatusAsync(
                orgTeacherMembership.Organization,
                orgTeacherMembership.OrganizationId,
                cancellationToken);
        }

        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.UserId == userId && !s.IsDeleted && s.Status == SubscriptionStatus.Active)
            .OrderByDescending(s => s.CurrentPeriodEnd)
            .FirstOrDefaultAsync(cancellationToken);

        var courseCount = await _context.Courses
            .CountAsync(c => c.InstructorId == userId && c.OrganizationId == null && !c.IsDeleted, cancellationToken);
        var totalSeats = await _context.CourseSections
            .Where(s => !s.IsDeleted && !s.Course.IsDeleted && s.Course.InstructorId == userId && s.Course.OrganizationId == null)
            .SumAsync(s => (int?)s.MaxSeats, cancellationToken) ?? 0;

        if (subscription == null)
        {
            return new SubscriptionStatusDto
            {
                HasActiveSubscription = false,
                CurrentCourseCount = courseCount,
                CanCreateCourse = false,
                CurrentTotalSeats = totalSeats
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
            RemainingCourses = maxCourses.HasValue ? Math.Max(0, maxCourses.Value - courseCount) : null,
            MaxSeatsPerCourse = subscription.Plan.MaxSeatsPerCourse,
            MaxTotalSeats = subscription.Plan.MaxTotalSeats,
            CurrentTotalSeats = totalSeats,
            RemainingTotalSeats = subscription.Plan.MaxTotalSeats.HasValue
                ? Math.Max(0, subscription.Plan.MaxTotalSeats.Value - totalSeats)
                : null
        };
    }

    private async Task<SubscriptionStatusDto> BuildOrganizationSubscriptionStatusAsync(
        Organization organization,
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        var courseCount = await _context.Courses
            .CountAsync(c => c.OrganizationId == organizationId && !c.IsDeleted, cancellationToken);
        var totalSeats = await _context.CourseSections
            .Where(s => !s.IsDeleted && !s.Course.IsDeleted && s.Course.OrganizationId == organizationId)
            .SumAsync(s => (int?)s.MaxSeats, cancellationToken) ?? 0;

        if (organization.SubscriptionId is not { } subscriptionId)
        {
            return new SubscriptionStatusDto
            {
                HasActiveSubscription = false,
                PlanName = organization.Name,
                CurrentCourseCount = courseCount,
                CanCreateCourse = false,
                CurrentTotalSeats = totalSeats
            };
        }

        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.Status == SubscriptionStatus.Active && !s.IsDeleted, cancellationToken);

        if (subscription is null)
        {
            return new SubscriptionStatusDto
            {
                HasActiveSubscription = false,
                PlanName = organization.Name,
                CurrentCourseCount = courseCount,
                CanCreateCourse = false,
                CurrentTotalSeats = totalSeats
            };
        }

        var maxCourses = subscription.Plan.MaxCourses;
        var canCreate = !maxCourses.HasValue || courseCount < maxCourses.Value;

        return new SubscriptionStatusDto
        {
            HasActiveSubscription = true,
            PlanName = subscription.Plan.Name + " (org-pooled)",
            MaxCourses = maxCourses,
            CurrentCourseCount = courseCount,
            CanCreateCourse = canCreate,
            RemainingCourses = maxCourses.HasValue ? Math.Max(0, maxCourses.Value - courseCount) : null,
            MaxSeatsPerCourse = subscription.Plan.MaxSeatsPerCourse,
            MaxTotalSeats = subscription.Plan.MaxTotalSeats,
            CurrentTotalSeats = totalSeats,
            RemainingTotalSeats = subscription.Plan.MaxTotalSeats.HasValue
                ? Math.Max(0, subscription.Plan.MaxTotalSeats.Value - totalSeats)
                : null
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
