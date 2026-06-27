using AcademixLMS.Domain.Common;

namespace AcademixLMS.Application.DTOs.Support;

public record SupportTicketDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string UserEmail,
    string Subject,
    string Message,
    SupportTicketCategory Category,
    SupportTicketStatus Status,
    SupportTicketPriority Priority,
    Guid? AssignedToUserId,
    string? AssignedToName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? FirstRespondedAt,
    DateTime? ResolvedAt,
    int ReplyCount);

public record SupportTicketReplyDto(
    Guid Id,
    Guid TicketId,
    Guid AuthorUserId,
    string AuthorName,
    string? AuthorProfilePictureUrl,
    string Message,
    bool IsInternal,
    bool IsStaff,
    DateTime CreatedAt);

public record SupportTicketDetailDto(
    SupportTicketDto Ticket,
    IReadOnlyList<SupportTicketReplyDto> Replies);

public record CreateSupportTicketRequest(
    string Subject,
    string Message,
    SupportTicketCategory Category);

public record CreateSupportTicketReplyRequest(
    string Message,
    bool IsInternal);

public record UpdateSupportTicketRequest(
    SupportTicketStatus? Status,
    SupportTicketPriority? Priority,
    Guid? AssignedToUserId);

public record SupportStaffMemberDto(
    Guid Id,
    string Name,
    string Email);
