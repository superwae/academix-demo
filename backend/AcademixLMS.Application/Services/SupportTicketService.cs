using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Support;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using System.Net;

namespace AcademixLMS.Application.Services;

public class SupportTicketService : ISupportTicketService
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SupportTicketService> _logger;
    private readonly IStringLocalizer<SupportTicketService> _localizer;

    public SupportTicketService(
        IApplicationDbContext context,
        INotificationService notificationService,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<SupportTicketService> logger,
        IStringLocalizer<SupportTicketService> localizer)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
        _localizer = localizer;
    }

    /// <summary>
    /// Initial priority derived from the category. Payment/account issues jump to High
    /// so they surface at the top of the inbox without admin intervention.
    /// </summary>
    private static SupportTicketPriority DefaultPriorityForCategory(SupportTicketCategory category) =>
        category switch
        {
            SupportTicketCategory.Billing => SupportTicketPriority.High,
            SupportTicketCategory.Account => SupportTicketPriority.High,
            SupportTicketCategory.Technical => SupportTicketPriority.Normal,
            SupportTicketCategory.Course => SupportTicketPriority.Normal,
            SupportTicketCategory.Feedback => SupportTicketPriority.Low,
            _ => SupportTicketPriority.Normal
        };

    public async Task<Result<IReadOnlyList<SupportTicketDto>>> GetMyTicketsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tickets = await _context.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .Where(t => t.UserId == userId && !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        var replyCounts = await _context.SupportTicketReplies
            .Where(r => !r.IsDeleted && !r.IsInternal && tickets.Select(t => t.Id).Contains(r.TicketId))
            .GroupBy(r => r.TicketId)
            .Select(g => new { TicketId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TicketId, x => x.Count, cancellationToken);

        var dtos = tickets.Select(t => Map(t, replyCounts.GetValueOrDefault(t.Id))).ToList();
        return Result<IReadOnlyList<SupportTicketDto>>.Success(dtos);
    }

    public async Task<Result<IReadOnlyList<SupportTicketDto>>> GetAllForAdminAsync(string? statusFilter, CancellationToken cancellationToken = default)
    {
        var q = _context.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .Where(t => !t.IsDeleted);

        if (!string.IsNullOrWhiteSpace(statusFilter) &&
            Enum.TryParse<SupportTicketStatus>(statusFilter, true, out var status))
        {
            q = q.Where(t => t.Status == status);
        }

        var tickets = await q.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);

        var replyCounts = await _context.SupportTicketReplies
            .Where(r => !r.IsDeleted && tickets.Select(t => t.Id).Contains(r.TicketId))
            .GroupBy(r => r.TicketId)
            .Select(g => new { TicketId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TicketId, x => x.Count, cancellationToken);

        var dtos = tickets.Select(t => Map(t, replyCounts.GetValueOrDefault(t.Id))).ToList();
        return Result<IReadOnlyList<SupportTicketDto>>.Success(dtos);
    }

    public async Task<Result<SupportTicketDetailDto>> GetByIdAsync(Guid ticketId, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var ticket = await _context.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted, cancellationToken);

        if (ticket is null) return Result<SupportTicketDetailDto>.Failure(_localizer["TicketNotFound"]);
        if (!isAdmin && ticket.UserId != requestingUserId)
            return Result<SupportTicketDetailDto>.Failure(_localizer["NotAuthorized"]);

        var replies = await _context.SupportTicketReplies
            .Include(r => r.Author)
            .Where(r => r.TicketId == ticketId && !r.IsDeleted && (isAdmin || !r.IsInternal))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        var staffRoleIds = await GetStaffRoleIdsAsync(cancellationToken);
        var staffUserIds = await _context.UserRoles
            .Where(ur => staffRoleIds.Contains(ur.RoleId) && !ur.IsDeleted)
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var replyDtos = replies.Select(r => new SupportTicketReplyDto(
            r.Id, r.TicketId, r.AuthorUserId,
            r.Author.FirstName + " " + r.Author.LastName,
            r.Author.ProfilePictureUrl,
            r.Message, r.IsInternal,
            staffUserIds.Contains(r.AuthorUserId),
            r.CreatedAt)).ToList();

        var count = replyDtos.Count(r => !r.IsInternal);
        var detail = new SupportTicketDetailDto(Map(ticket, count), replyDtos);
        return Result<SupportTicketDetailDto>.Success(detail);
    }

    public async Task<Result<SupportTicketDto>> CreateAsync(Guid userId, CreateSupportTicketRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Subject))
            return Result<SupportTicketDto>.Failure(_localizer["SubjectRequired"]);
        if (string.IsNullOrWhiteSpace(request.Message))
            return Result<SupportTicketDto>.Failure(_localizer["MessageRequired"]);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);
        if (user is null) return Result<SupportTicketDto>.Failure(_localizer["UserNotFound"]);

        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            Category = request.Category,
            Status = SupportTicketStatus.Open,
            Priority = DefaultPriorityForCategory(request.Category),
            CreatedBy = userId
        };
        _context.SupportTickets.Add(ticket);
        await _context.SaveChangesAsync(cancellationToken);
        ticket.User = user;

        _logger.LogInformation("SupportTicket {Id} opened by {User}: {Subject} (priority={Priority})",
            ticket.Id, userId, ticket.Subject, ticket.Priority);

        // Email the configured support inbox so staff get it in their mail even when the app isn't open.
        try
        {
            var notifyEmail = _configuration["Support:NotifyEmail"];
            if (!string.IsNullOrWhiteSpace(notifyEmail))
            {
                var subject = $"[Support][{ticket.Priority}] {ticket.Subject}";
                var html = BuildNewTicketEmailHtml(ticket, user);
                var plain = BuildNewTicketEmailText(ticket, user);
                await _emailService.SendAsync(
                    toEmail: notifyEmail.Trim(),
                    toName: "Support Team",
                    subject: subject,
                    htmlBody: html,
                    plainTextBody: plain,
                    logLabel: "support.ticket.created",
                    cancellationToken: cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to email support inbox for ticket {Id}", ticket.Id);
        }

        // Notify every admin / superadmin so the inbox gets a real-time badge.
        try
        {
            var staffRoleIds = await GetStaffRoleIdsAsync(cancellationToken);
            var adminIds = await _context.UserRoles
                .Where(ur => staffRoleIds.Contains(ur.RoleId) && !ur.IsDeleted)
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            foreach (var adminId in adminIds)
            {
                await _notificationService.CreateAsync(
                    adminId,
                    type: "support.ticket.created",
                    title: _localizer["NewTicketTitle"],
                    message: _localizer["NewTicketMessage", user.FirstName + " " + user.LastName, ticket.Subject],
                    link: $"/admin/support-tickets/{ticket.Id}",
                    cancellationToken: cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to notify admins of new support ticket {Id}", ticket.Id);
        }

        return Result<SupportTicketDto>.Success(Map(ticket, 0));
    }

    public async Task<Result<SupportTicketReplyDto>> AddReplyAsync(Guid ticketId, Guid authorUserId, bool isStaff, CreateSupportTicketReplyRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return Result<SupportTicketReplyDto>.Failure(_localizer["MessageRequired"]);

        var ticket = await _context.SupportTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted, cancellationToken);
        if (ticket is null) return Result<SupportTicketReplyDto>.Failure(_localizer["TicketNotFound"]);

        // Only staff can write internal notes. Only the ticket owner or staff can reply at all.
        if (!isStaff && ticket.UserId != authorUserId)
            return Result<SupportTicketReplyDto>.Failure(_localizer["NotAuthorized"]);

        var isInternal = isStaff && request.IsInternal;

        var author = await _context.Users.FirstOrDefaultAsync(u => u.Id == authorUserId && !u.IsDeleted, cancellationToken);
        if (author is null) return Result<SupportTicketReplyDto>.Failure(_localizer["UserNotFound"]);

        var reply = new SupportTicketReply
        {
            Id = Guid.NewGuid(),
            TicketId = ticketId,
            AuthorUserId = authorUserId,
            Message = request.Message.Trim(),
            IsInternal = isInternal,
            CreatedBy = authorUserId
        };
        _context.SupportTicketReplies.Add(reply);

        // Status transitions
        var now = DateTime.UtcNow;
        if (isStaff && !isInternal)
        {
            ticket.FirstRespondedAt ??= now;
            if (ticket.Status == SupportTicketStatus.Open)
                ticket.Status = SupportTicketStatus.WaitingOnUser;
        }
        else if (!isStaff && ticket.Status == SupportTicketStatus.WaitingOnUser)
        {
            ticket.Status = SupportTicketStatus.InProgress;
        }
        ticket.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);

        // Notify the other party on a non-internal reply.
        try
        {
            if (!isInternal)
            {
                if (isStaff)
                {
                    await _notificationService.CreateAsync(
                        ticket.UserId,
                        type: "support.ticket.replied",
                        title: _localizer["StaffRepliedTitle"],
                        message: _localizer["StaffRepliedMessage", ticket.Subject],
                        link: $"/support/{ticket.Id}",
                        cancellationToken: cancellationToken);
                }
                else if (ticket.AssignedToUserId is Guid assignee && assignee != ticket.UserId)
                {
                    await _notificationService.CreateAsync(
                        assignee,
                        type: "support.ticket.replied",
                        title: _localizer["UserRepliedTitle"],
                        message: _localizer["UserRepliedMessage", author.FirstName + " " + author.LastName, ticket.Subject],
                        link: $"/admin/support-tickets/{ticket.Id}",
                        cancellationToken: cancellationToken);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to notify on support reply {ReplyId}", reply.Id);
        }

        var staffRoleIds = await GetStaffRoleIdsAsync(cancellationToken);
        var authorIsStaff = await _context.UserRoles
            .AnyAsync(ur => ur.UserId == authorUserId && staffRoleIds.Contains(ur.RoleId) && !ur.IsDeleted, cancellationToken);

        return Result<SupportTicketReplyDto>.Success(new SupportTicketReplyDto(
            reply.Id, reply.TicketId, reply.AuthorUserId,
            author.FirstName + " " + author.LastName, author.ProfilePictureUrl,
            reply.Message, reply.IsInternal, authorIsStaff, reply.CreatedAt));
    }

    public async Task<Result<SupportTicketDto>> UpdateAsync(Guid ticketId, Guid adminUserId, UpdateSupportTicketRequest request, CancellationToken cancellationToken = default)
    {
        var ticket = await _context.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .FirstOrDefaultAsync(t => t.Id == ticketId && !t.IsDeleted, cancellationToken);

        if (ticket is null) return Result<SupportTicketDto>.Failure(_localizer["TicketNotFound"]);

        if (request.Status.HasValue)
        {
            var previousStatus = ticket.Status;
            ticket.Status = request.Status.Value;
            if (request.Status == SupportTicketStatus.Resolved && ticket.ResolvedAt is null)
                ticket.ResolvedAt = DateTime.UtcNow;
            if (request.Status != SupportTicketStatus.Resolved && previousStatus == SupportTicketStatus.Resolved)
                ticket.ResolvedAt = null;
        }
        if (request.Priority.HasValue) ticket.Priority = request.Priority.Value;
        if (request.AssignedToUserId.HasValue)
        {
            var assignee = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToUserId.Value && !u.IsDeleted, cancellationToken);
            if (assignee is null) return Result<SupportTicketDto>.Failure(_localizer["UserNotFound"]);
            ticket.AssignedToUserId = assignee.Id;
            ticket.AssignedTo = assignee;
        }

        ticket.UpdatedAt = DateTime.UtcNow;
        ticket.UpdatedBy = adminUserId;
        await _context.SaveChangesAsync(cancellationToken);

        var count = await _context.SupportTicketReplies
            .CountAsync(r => r.TicketId == ticketId && !r.IsDeleted && !r.IsInternal, cancellationToken);
        return Result<SupportTicketDto>.Success(Map(ticket, count));
    }

    private async Task<List<Guid>> GetStaffRoleIdsAsync(CancellationToken cancellationToken) =>
        await _context.Roles
            .Where(r => (r.Name == "Admin" || r.Name == "SuperAdmin") && !r.IsDeleted)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

    private static string BuildNewTicketEmailText(SupportTicket ticket, User user)
    {
        return $"New support ticket\n\n" +
               $"From: {user.FirstName} {user.LastName} <{user.Email}>\n" +
               $"Category: {ticket.Category}\n" +
               $"Priority: {ticket.Priority}\n" +
               $"Subject: {ticket.Subject}\n\n" +
               $"Message:\n{ticket.Message}\n\n" +
               $"---\nTicket ID: {ticket.Id}\nOpened: {ticket.CreatedAt:yyyy-MM-dd HH:mm} UTC";
    }

    private static string BuildNewTicketEmailHtml(SupportTicket ticket, User user)
    {
        static string Enc(string s) => WebUtility.HtmlEncode(s);
        var priorityColor = ticket.Priority switch
        {
            SupportTicketPriority.Urgent => "#dc2626",
            SupportTicketPriority.High => "#ea580c",
            SupportTicketPriority.Normal => "#475569",
            SupportTicketPriority.Low => "#94a3b8",
            _ => "#475569"
        };
        var messageHtml = Enc(ticket.Message).Replace("\n", "<br>");
        return $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, Segoe UI, sans-serif; color: #0f172a; line-height: 1.5; background:#f8fafc; padding:16px;"">
  <div style=""max-width:640px; margin:0 auto; background:#fff; border-radius:12px; padding:24px; border:1px solid #e2e8f0;"">
    <h1 style=""margin:0 0 16px; font-size:20px;"">New support ticket</h1>
    <table style=""width:100%; font-size:14px; border-collapse:collapse;"">
      <tr><td style=""color:#64748b; padding:4px 8px 4px 0; vertical-align:top;"">From</td><td style=""padding:4px 0;""><strong>{Enc(user.FirstName)} {Enc(user.LastName)}</strong> &lt;{Enc(user.Email)}&gt;</td></tr>
      <tr><td style=""color:#64748b; padding:4px 8px 4px 0;"">Category</td><td style=""padding:4px 0;"">{Enc(ticket.Category.ToString())}</td></tr>
      <tr><td style=""color:#64748b; padding:4px 8px 4px 0;"">Priority</td><td style=""padding:4px 0; color:{priorityColor}; font-weight:600;"">{Enc(ticket.Priority.ToString())}</td></tr>
      <tr><td style=""color:#64748b; padding:4px 8px 4px 0;"">Subject</td><td style=""padding:4px 0;""><strong>{Enc(ticket.Subject)}</strong></td></tr>
    </table>
    <div style=""margin-top:16px; padding:14px 16px; background:#f1f5f9; border-radius:8px; white-space:pre-wrap; font-size:14px;"">{messageHtml}</div>
    <p style=""margin-top:20px; font-size:12px; color:#64748b;"">Ticket ID: {ticket.Id}<br>Opened: {ticket.CreatedAt:yyyy-MM-dd HH:mm} UTC</p>
  </div>
</body></html>";
    }

    private static SupportTicketDto Map(SupportTicket t, int replyCount) => new(
        t.Id, t.UserId,
        t.User?.FirstName + " " + t.User?.LastName,
        t.User?.Email ?? string.Empty,
        t.Subject, t.Message,
        t.Category, t.Status, t.Priority,
        t.AssignedToUserId,
        t.AssignedTo is null ? null : t.AssignedTo.FirstName + " " + t.AssignedTo.LastName,
        t.CreatedAt, t.UpdatedAt, t.FirstRespondedAt, t.ResolvedAt, replyCount);
}
