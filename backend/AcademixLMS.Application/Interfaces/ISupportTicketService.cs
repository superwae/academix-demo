using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Support;

namespace AcademixLMS.Application.Interfaces;

public interface ISupportTicketService
{
    Task<Result<IReadOnlyList<SupportTicketDto>>> GetMyTicketsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<SupportTicketDto>>> GetAllForAdminAsync(string? statusFilter, CancellationToken cancellationToken = default);
    Task<Result<SupportTicketDetailDto>> GetByIdAsync(Guid ticketId, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default);

    Task<Result<SupportTicketDto>> CreateAsync(Guid userId, CreateSupportTicketRequest request, CancellationToken cancellationToken = default);
    Task<Result<SupportTicketReplyDto>> AddReplyAsync(Guid ticketId, Guid authorUserId, bool isStaff, CreateSupportTicketReplyRequest request, CancellationToken cancellationToken = default);
    Task<Result<SupportTicketDto>> UpdateAsync(Guid ticketId, Guid adminUserId, UpdateSupportTicketRequest request, CancellationToken cancellationToken = default);
}
