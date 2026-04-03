using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Subscription;
using AcademixLMS.Domain.Common;

namespace AcademixLMS.Application.Interfaces;

public interface ISubscriptionService
{
    Task<Result<SubscriptionDto>> GetSubscriptionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<bool>> CanCreateCourseAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionStatusDto>> GetSubscriptionStatusAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<int>> GetCourseCountForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<SubscriptionDto>> SubscribeAsync(Guid userId, Guid planId, BillingInterval billingInterval, CancellationToken cancellationToken = default);
    Task<Result> CancelSubscriptionAsync(Guid subscriptionId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result> HandleSubscriptionPaymentAsync(string lahzaReference, CancellationToken cancellationToken = default);
}
