using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Subscription;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class SubscriptionPlanService : ISubscriptionPlanService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<SubscriptionPlanService> _logger;

    public SubscriptionPlanService(
        IApplicationDbContext context,
        ILogger<SubscriptionPlanService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<SubscriptionPlanDto>>> GetAllPlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await _context.SubscriptionPlans
            .Where(p => !p.IsDeleted && p.IsActive)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(cancellationToken);

        var dtos = plans.Select(MapToPlanDto).ToList();
        return Result<List<SubscriptionPlanDto>>.Success(dtos);
    }

    public async Task<Result<SubscriptionPlanDto>> GetPlanByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result<SubscriptionPlanDto>.Failure("Subscription plan not found.");
        }

        return Result<SubscriptionPlanDto>.Success(MapToPlanDto(plan));
    }

    public async Task<Result<SubscriptionPlanDto>> CreatePlanAsync(CreateSubscriptionPlanRequest request, Guid createdBy, CancellationToken cancellationToken = default)
    {
        var plan = new SubscriptionPlan
        {
            Name = request.Name,
            Description = request.Description,
            MonthlyPrice = request.MonthlyPrice,
            YearlyPrice = request.YearlyPrice,
            MaxCourses = request.MaxCourses,
            MaxSeatsPerCourse = request.MaxSeatsPerCourse,
            MaxTotalSeats = request.MaxTotalSeats,
            FeaturesJson = request.FeaturesJson,
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedBy = createdBy
        };

        _context.SubscriptionPlans.Add(plan);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Subscription plan '{PlanName}' created by {UserId}.", plan.Name, createdBy);
        return Result<SubscriptionPlanDto>.Success(MapToPlanDto(plan));
    }

    public async Task<Result<SubscriptionPlanDto>> UpdatePlanAsync(Guid id, UpdateSubscriptionPlanRequest request, Guid updatedBy, CancellationToken cancellationToken = default)
    {
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result<SubscriptionPlanDto>.Failure("Subscription plan not found.");
        }

        if (request.Name != null) plan.Name = request.Name;
        if (request.Description != null) plan.Description = request.Description;
        if (request.MonthlyPrice.HasValue) plan.MonthlyPrice = request.MonthlyPrice.Value;
        if (request.YearlyPrice.HasValue) plan.YearlyPrice = request.YearlyPrice.Value;
        if (request.MaxCourses.HasValue) plan.MaxCourses = request.MaxCourses.Value;
        if (request.MaxSeatsPerCourse.HasValue) plan.MaxSeatsPerCourse = request.MaxSeatsPerCourse.Value;
        if (request.MaxTotalSeats.HasValue) plan.MaxTotalSeats = request.MaxTotalSeats.Value;
        if (request.FeaturesJson != null) plan.FeaturesJson = request.FeaturesJson;
        if (request.IsActive.HasValue) plan.IsActive = request.IsActive.Value;
        if (request.SortOrder.HasValue) plan.SortOrder = request.SortOrder.Value;

        plan.UpdatedAt = DateTime.UtcNow;
        plan.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Subscription plan '{PlanName}' updated by {UserId}.", plan.Name, updatedBy);
        return Result<SubscriptionPlanDto>.Success(MapToPlanDto(plan));
    }

    public async Task<Result> DeletePlanAsync(Guid id, Guid deletedBy, CancellationToken cancellationToken = default)
    {
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result.Failure("Subscription plan not found.");
        }

        // Check if any active subscriptions use this plan
        var hasActiveSubscriptions = await _context.Subscriptions
            .AnyAsync(s => s.PlanId == id && !s.IsDeleted && s.Status == Domain.Common.SubscriptionStatus.Active, cancellationToken);

        if (hasActiveSubscriptions)
        {
            return Result.Failure("Cannot delete a plan with active subscriptions. Deactivate the plan instead.");
        }

        plan.IsDeleted = true;
        plan.DeletedAt = DateTime.UtcNow;
        plan.DeletedBy = deletedBy;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Subscription plan '{PlanName}' soft-deleted by {UserId}.", plan.Name, deletedBy);
        return Result.Success();
    }

    private static SubscriptionPlanDto MapToPlanDto(SubscriptionPlan plan) => new()
    {
        Id = plan.Id,
        Name = plan.Name,
        Description = plan.Description,
        MonthlyPrice = plan.MonthlyPrice,
        YearlyPrice = plan.YearlyPrice,
        MaxCourses = plan.MaxCourses,
        MaxSeatsPerCourse = plan.MaxSeatsPerCourse,
        MaxTotalSeats = plan.MaxTotalSeats,
        FeaturesJson = plan.FeaturesJson,
        IsActive = plan.IsActive,
        SortOrder = plan.SortOrder
    };
}
