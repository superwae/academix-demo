using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Subscription;

namespace AcademixLMS.Application.Interfaces;

public interface ISubscriptionPlanService
{
    Task<Result<List<SubscriptionPlanDto>>> GetAllPlansAsync(CancellationToken cancellationToken = default);
    Task<Result<SubscriptionPlanDto>> GetPlanByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionPlanDto>> CreatePlanAsync(CreateSubscriptionPlanRequest request, Guid createdBy, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionPlanDto>> UpdatePlanAsync(Guid id, UpdateSubscriptionPlanRequest request, Guid updatedBy, CancellationToken cancellationToken = default);
    Task<Result> DeletePlanAsync(Guid id, Guid deletedBy, CancellationToken cancellationToken = default);
}
