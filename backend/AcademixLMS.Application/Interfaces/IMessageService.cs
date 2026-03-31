using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Message;

namespace AcademixLMS.Application.Interfaces;

public interface IMessageService
{
    Task<Result<MessageDto>> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<MessageDto>>> GetInboxAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<MessageDto>>> GetSentAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<Result<MessageDto>> SendAsync(SendMessageRequest request, Guid fromUserId, CancellationToken cancellationToken = default);
    Task<Result> MarkAsReadAsync(Guid messageId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result> ArchiveAsync(Guid messageId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<int>> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);
}


