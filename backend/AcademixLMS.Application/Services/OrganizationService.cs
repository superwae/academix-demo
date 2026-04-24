using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using System.Text;

namespace AcademixLMS.Application.Services;

public class OrganizationService : IOrganizationService
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OrganizationService> _logger;
    private readonly IStringLocalizer<OrganizationService> _localizer;

    public OrganizationService(
        IApplicationDbContext context,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<OrganizationService> logger,
        IStringLocalizer<OrganizationService> localizer)
    {
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
        _localizer = localizer;
    }

    private int InviteExpiresDays => _configuration.GetValue<int?>("Organizations:InviteExpiresDays") ?? 7;
    private string FrontendBaseUrl => (_configuration["App:FrontendBaseUrl"] ?? "http://localhost:5174").TrimEnd('/');

    public async Task<Result<IReadOnlyList<OrganizationSummaryDto>>> GetMyOrganizationsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var memberships = await _context.OrganizationMembers
            .Include(m => m.Organization)
            .Where(m => m.UserId == userId && m.IsActive && !m.IsDeleted && m.Organization.IsActive && !m.Organization.IsDeleted)
            .OrderBy(m => m.Organization.Name)
            .Select(m => new OrganizationSummaryDto(
                m.OrganizationId,
                m.Organization.Name,
                m.Organization.Slug,
                m.Organization.Type,
                m.Organization.LogoUrl,
                m.Role))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<OrganizationSummaryDto>>.Success(memberships);
    }

    public async Task<Result<OrganizationDto>> GetByIdAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var org = await LoadOrgAsync(orgId, cancellationToken);
        if (org is null) return Result<OrganizationDto>.Failure(_localizer["OrganizationNotFound"]);

        if (!await IsMemberAsync(orgId, requestingUserId, cancellationToken))
            return Result<OrganizationDto>.Failure(_localizer["NoAccess"]);

        return Result<OrganizationDto>.Success(await MapAsync(org, cancellationToken));
    }

    public async Task<Result<OrganizationDto>> GetBySlugAsync(string slug, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var org = await _context.Organizations
            .Include(o => o.Owner)
            .FirstOrDefaultAsync(o => o.Slug == slug && !o.IsDeleted, cancellationToken);
        if (org is null) return Result<OrganizationDto>.Failure(_localizer["OrganizationNotFound"]);

        if (!await IsMemberAsync(org.Id, requestingUserId, cancellationToken))
            return Result<OrganizationDto>.Failure(_localizer["NoAccess"]);

        return Result<OrganizationDto>.Success(await MapAsync(org, cancellationToken));
    }

    public async Task<Result<IReadOnlyList<OrganizationDto>>> GetAllForAdminAsync(CancellationToken cancellationToken = default)
    {
        var orgs = await _context.Organizations
            .Include(o => o.Owner)
            .Where(o => !o.IsDeleted)
            .OrderBy(o => o.Name)
            .ToListAsync(cancellationToken);

        var result = new List<OrganizationDto>(orgs.Count);
        foreach (var org in orgs) result.Add(await MapAsync(org, cancellationToken));
        return Result<IReadOnlyList<OrganizationDto>>.Success(result);
    }

    public async Task<Result<OrganizationDto>> CreateAsync(Guid ownerUserId, CreateOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Result<OrganizationDto>.Failure(_localizer["NameRequired"]);

        var owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerUserId && !u.IsDeleted, cancellationToken);
        if (owner is null) return Result<OrganizationDto>.Failure(_localizer["OwnerNotFound"]);

        var slug = await MakeUniqueSlugAsync(Slugify(request.Name), cancellationToken);
        var org = new Organization
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description,
            Website = request.Website,
            ContactEmail = request.ContactEmail,
            Type = request.Type,
            OwnerUserId = ownerUserId,
            PlatformFeePercent = request.Type == OrganizationType.TeachingInstitution ? 15m : 0m,
            OrgFeePercent = request.Type == OrganizationType.TeachingInstitution ? 30m : 0m,
            IsActive = true,
            CreatedBy = ownerUserId
        };
        _context.Organizations.Add(org);

        _context.OrganizationMembers.Add(new OrganizationMember
        {
            Id = Guid.NewGuid(),
            OrganizationId = org.Id,
            UserId = ownerUserId,
            Role = OrgMemberRole.OrgAdmin,
            JoinedAt = DateTime.UtcNow,
            InviteAcceptedAt = DateTime.UtcNow,
            IsActive = true,
            CreatedBy = ownerUserId
        });

        await _context.SaveChangesAsync(cancellationToken);
        org.Owner = owner;

        _logger.LogInformation("Organization created: {Slug} by {User}", slug, ownerUserId);
        return Result<OrganizationDto>.Success(await MapAsync(org, cancellationToken));
    }

    public async Task<Result<OrganizationDto>> UpdateAsync(Guid orgId, Guid requestingUserId, UpdateOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        var org = await LoadOrgAsync(orgId, cancellationToken);
        if (org is null) return Result<OrganizationDto>.Failure(_localizer["OrganizationNotFound"]);

        if (!await HasRoleAsync(orgId, requestingUserId, OrgMemberRole.OrgAdmin, cancellationToken))
            return Result<OrganizationDto>.Failure(_localizer["OnlyAdminCanUpdate"]);

        org.Name = request.Name.Trim();
        org.Description = request.Description;
        org.Website = request.Website;
        org.ContactEmail = request.ContactEmail;
        org.LogoUrl = request.LogoUrl;
        org.PlatformFeePercent = Math.Clamp(request.PlatformFeePercent, 0m, 100m);
        org.OrgFeePercent = Math.Clamp(request.OrgFeePercent, 0m, 100m);
        org.UpdatedAt = DateTime.UtcNow;
        org.UpdatedBy = requestingUserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<OrganizationDto>.Success(await MapAsync(org, cancellationToken));
    }

    public async Task<Result<IReadOnlyList<OrganizationMemberDto>>> GetMembersAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        if (!await IsMemberAsync(orgId, requestingUserId, cancellationToken))
            return Result<IReadOnlyList<OrganizationMemberDto>>.Failure(_localizer["NoAccess"]);

        var members = await _context.OrganizationMembers
            .Include(m => m.User)
            .Where(m => m.OrganizationId == orgId && !m.IsDeleted)
            .OrderBy(m => m.Role).ThenBy(m => m.User.FirstName)
            .Select(m => new OrganizationMemberDto(
                m.Id, m.OrganizationId, m.UserId,
                m.User.FirstName, m.User.LastName, m.User.Email, m.User.ProfilePictureUrl,
                m.Role, m.ExternalReference, m.JoinedAt, m.LeftAt, m.IsActive,
                m.InviteAcceptedAt != null))
            .ToListAsync(cancellationToken);
        return Result<IReadOnlyList<OrganizationMemberDto>>.Success(members);
    }

    public async Task<Result<OrganizationMemberDto>> InviteMemberAsync(Guid orgId, Guid requestingUserId, InviteMemberRequest request, CancellationToken cancellationToken = default)
    {
        if (!await HasRoleAsync(orgId, requestingUserId, OrgMemberRole.OrgAdmin, cancellationToken))
            return Result<OrganizationMemberDto>.Failure(_localizer["OnlyAdminCanInvite"]);

        if (string.IsNullOrWhiteSpace(request.Email))
            return Result<OrganizationMemberDto>.Failure(_localizer["EmailRequired"]);

        var email = request.Email.Trim().ToLowerInvariant();

        var org = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == orgId && !o.IsDeleted, cancellationToken);
        if (org is null) return Result<OrganizationMemberDto>.Failure(_localizer["OrganizationNotFound"]);

        if (org.Type == OrganizationType.TeachingInstitution && request.Role == OrgMemberRole.OrgEmployee)
            return Result<OrganizationMemberDto>.Failure(_localizer["TeachingInstitutionsNoEmployees"]);
        if (org.Type == OrganizationType.Employer && request.Role == OrgMemberRole.OrgTeacher)
            return Result<OrganizationMemberDto>.Failure(_localizer["EmployersNoTeachers"]);

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email && !u.IsDeleted, cancellationToken);
        Guid userId;
        bool userWasNew;

        if (existingUser is null)
        {
            // Create a placeholder user; they set their password via the invite email link.
            var placeholder = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                PasswordHash = string.Empty,
                FirstName = email.Split('@')[0],
                LastName = string.Empty,
                IsActive = true,
                IsEmailVerified = false,
                CreatedBy = requestingUserId
            };
            _context.Users.Add(placeholder);
            userId = placeholder.Id;
            userWasNew = true;
        }
        else
        {
            var alreadyMember = await _context.OrganizationMembers
                .AnyAsync(m => m.OrganizationId == orgId && m.UserId == existingUser.Id && m.IsActive && !m.IsDeleted, cancellationToken);
            if (alreadyMember)
                return Result<OrganizationMemberDto>.Failure(_localizer["AlreadyMember"]);
            userId = existingUser.Id;
            userWasNew = false;
        }

        var token = userWasNew ? GenerateInviteToken() : null;
        var expiresAt = userWasNew ? DateTime.UtcNow.AddDays(InviteExpiresDays) : (DateTime?)null;
        var member = new OrganizationMember
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgId,
            UserId = userId,
            Role = request.Role,
            JoinedAt = DateTime.UtcNow,
            IsActive = true,
            ExternalReference = request.ExternalReference,
            InviteToken = token,
            InviteSentAt = DateTime.UtcNow,
            InviteExpiresAt = expiresAt,
            InviteAcceptedAt = userWasNew ? null : DateTime.UtcNow,
            CreatedBy = requestingUserId
        };
        _context.OrganizationMembers.Add(member);

        await _context.SaveChangesAsync(cancellationToken);

        var user = await _context.Users.FirstAsync(u => u.Id == userId, cancellationToken);

        // Fire the invite email outside the DB call so failures don't roll back the invite row.
        try
        {
            if (userWasNew && token is not null)
            {
                var link = $"{FrontendBaseUrl}/accept-invite?token={Uri.EscapeDataString(token)}";
                var html = BuildInviteEmailHtml(org.Name, request.Role, link, InviteExpiresDays);
                var plain = BuildInviteEmailText(org.Name, request.Role, link, InviteExpiresDays);
                await _emailService.SendAsync(
                    toEmail: user.Email,
                    toName: email,
                    subject: $"You're invited to {org.Name} on AcademiX",
                    htmlBody: html,
                    plainTextBody: plain,
                    logLabel: "org.member.invite.new",
                    cancellationToken: cancellationToken);
            }
            else if (!userWasNew)
            {
                // Existing user, joined automatically. Courtesy notice so they know they were added.
                var plain = $"You have been added to {org.Name} as {request.Role}. Sign in and you'll see the org portal.";
                await _emailService.SendAsync(
                    toEmail: user.Email,
                    toName: user.FirstName,
                    subject: $"You were added to {org.Name} on AcademiX",
                    htmlBody: $"<p>Hi {System.Net.WebUtility.HtmlEncode(user.FirstName)},</p><p>You've been added to <strong>{System.Net.WebUtility.HtmlEncode(org.Name)}</strong> as <strong>{request.Role}</strong>. Sign in and switch to the organization portal to see it.</p>",
                    plainTextBody: plain,
                    logLabel: "org.member.invite.existing",
                    cancellationToken: cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invite email failed for member {MemberId}", member.Id);
        }

        return Result<OrganizationMemberDto>.Success(new OrganizationMemberDto(
            member.Id, member.OrganizationId, member.UserId,
            user.FirstName, user.LastName, user.Email, user.ProfilePictureUrl,
            member.Role, member.ExternalReference, member.JoinedAt, member.LeftAt, member.IsActive,
            member.InviteAcceptedAt != null));
    }

    public async Task<Result<IReadOnlyList<OrganizationMemberDto>>> BulkInviteMembersAsync(Guid orgId, Guid requestingUserId, BulkInviteMembersRequest request, CancellationToken cancellationToken = default)
    {
        var results = new List<OrganizationMemberDto>();
        var errors = new List<string>();
        foreach (var invite in request.Members)
        {
            var r = await InviteMemberAsync(orgId, requestingUserId, invite, cancellationToken);
            if (r.IsSuccess && r.Value is not null) results.Add(r.Value);
            else if (r.Error is not null) errors.Add($"{invite.Email}: {r.Error}");
        }
        if (results.Count == 0 && errors.Count > 0)
            return Result<IReadOnlyList<OrganizationMemberDto>>.Failure(errors);
        return Result<IReadOnlyList<OrganizationMemberDto>>.Success(results);
    }

    public async Task<Result<OrganizationMemberDto>> UpdateMemberRoleAsync(Guid orgId, Guid memberId, Guid requestingUserId, UpdateMemberRoleRequest request, CancellationToken cancellationToken = default)
    {
        if (!await HasRoleAsync(orgId, requestingUserId, OrgMemberRole.OrgAdmin, cancellationToken))
            return Result<OrganizationMemberDto>.Failure(_localizer["OnlyAdminCanChangeRoles"]);

        var member = await _context.OrganizationMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.Id == memberId && m.OrganizationId == orgId && !m.IsDeleted, cancellationToken);
        if (member is null) return Result<OrganizationMemberDto>.Failure(_localizer["MemberNotFound"]);

        // Prevent demoting the last admin
        if (member.Role == OrgMemberRole.OrgAdmin && request.Role != OrgMemberRole.OrgAdmin)
        {
            var adminCount = await _context.OrganizationMembers
                .CountAsync(m => m.OrganizationId == orgId && m.Role == OrgMemberRole.OrgAdmin && m.IsActive && !m.IsDeleted, cancellationToken);
            if (adminCount <= 1)
                return Result<OrganizationMemberDto>.Failure(_localizer["CannotRemoveLastAdminPromote"]);
        }

        member.Role = request.Role;
        member.UpdatedAt = DateTime.UtcNow;
        member.UpdatedBy = requestingUserId;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<OrganizationMemberDto>.Success(new OrganizationMemberDto(
            member.Id, member.OrganizationId, member.UserId,
            member.User.FirstName, member.User.LastName, member.User.Email, member.User.ProfilePictureUrl,
            member.Role, member.ExternalReference, member.JoinedAt, member.LeftAt, member.IsActive,
            member.InviteAcceptedAt != null));
    }

    public async Task<Result<bool>> RemoveMemberAsync(Guid orgId, Guid memberId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        if (!await HasRoleAsync(orgId, requestingUserId, OrgMemberRole.OrgAdmin, cancellationToken))
            return Result<bool>.Failure(_localizer["OnlyAdminCanRemove"]);

        var member = await _context.OrganizationMembers
            .FirstOrDefaultAsync(m => m.Id == memberId && m.OrganizationId == orgId && !m.IsDeleted, cancellationToken);
        if (member is null) return Result<bool>.Failure(_localizer["MemberNotFound"]);

        if (member.Role == OrgMemberRole.OrgAdmin)
        {
            var adminCount = await _context.OrganizationMembers
                .CountAsync(m => m.OrganizationId == orgId && m.Role == OrgMemberRole.OrgAdmin && m.IsActive && !m.IsDeleted, cancellationToken);
            if (adminCount <= 1)
                return Result<bool>.Failure(_localizer["CannotRemoveLastAdmin"]);
        }

        member.IsActive = false;
        member.LeftAt = DateTime.UtcNow;
        member.UpdatedAt = DateTime.UtcNow;
        member.UpdatedBy = requestingUserId;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    // ---- helpers ----

    private async Task<Organization?> LoadOrgAsync(Guid orgId, CancellationToken cancellationToken) =>
        await _context.Organizations.Include(o => o.Owner).FirstOrDefaultAsync(o => o.Id == orgId && !o.IsDeleted, cancellationToken);

    private async Task<bool> IsMemberAsync(Guid orgId, Guid userId, CancellationToken cancellationToken) =>
        await _context.OrganizationMembers.AnyAsync(m => m.OrganizationId == orgId && m.UserId == userId && m.IsActive && !m.IsDeleted, cancellationToken);

    private async Task<bool> HasRoleAsync(Guid orgId, Guid userId, OrgMemberRole requiredRole, CancellationToken cancellationToken)
    {
        var member = await _context.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId && m.IsActive && !m.IsDeleted, cancellationToken);
        if (member is null) return false;
        // OrgAdmin outranks everything
        if (member.Role == OrgMemberRole.OrgAdmin) return true;
        return member.Role == requiredRole;
    }

    private async Task<OrganizationDto> MapAsync(Organization org, CancellationToken cancellationToken)
    {
        var memberCount = await _context.OrganizationMembers.CountAsync(m => m.OrganizationId == org.Id && m.IsActive && !m.IsDeleted, cancellationToken);
        var courseCount = await _context.Courses.CountAsync(c => c.OrganizationId == org.Id && !c.IsDeleted, cancellationToken);
        var licenseCount = await _context.CourseLicenses.CountAsync(l => l.OrganizationId == org.Id && !l.IsDeleted, cancellationToken);

        return new OrganizationDto(
            org.Id, org.Name, org.Slug, org.Description, org.LogoUrl, org.Website, org.ContactEmail,
            org.Type, org.OwnerUserId,
            org.Owner?.FullName ?? string.Empty,
            org.Owner?.Email ?? string.Empty,
            org.PlatformFeePercent, org.OrgFeePercent, org.IsActive,
            memberCount, courseCount, licenseCount, org.CreatedAt);
    }

    private async Task<string> MakeUniqueSlugAsync(string baseSlug, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var n = 1;
        while (await _context.Organizations.AnyAsync(o => o.Slug == slug && !o.IsDeleted, cancellationToken))
        {
            n++;
            slug = $"{baseSlug}-{n}";
        }
        return slug;
    }

    private static string Slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "org";
        var sb = new StringBuilder();
        foreach (var ch in input.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (ch == ' ' || ch == '-' || ch == '_') sb.Append('-');
        }
        var s = sb.ToString().Trim('-');
        while (s.Contains("--")) s = s.Replace("--", "-");
        return string.IsNullOrEmpty(s) ? "org" : s;
    }

    public async Task<Result<InvitePreviewDto>> PreviewInviteAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Result<InvitePreviewDto>.Failure(_localizer["InviteNotFound"]);

        var member = await _context.OrganizationMembers
            .Include(m => m.Organization)
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.InviteToken == token && !m.IsDeleted, cancellationToken);

        if (member is null || member.InviteAcceptedAt is not null)
            return Result<InvitePreviewDto>.Failure(_localizer["InviteNotFound"]);

        if (member.InviteExpiresAt is { } exp && exp < DateTime.UtcNow)
            return Result<InvitePreviewDto>.Failure(_localizer["InviteExpired"]);

        var needsPassword = string.IsNullOrEmpty(member.User.PasswordHash);
        return Result<InvitePreviewDto>.Success(new InvitePreviewDto(
            member.User.Email,
            member.Organization.Name,
            member.Organization.Type,
            member.Role,
            member.InviteExpiresAt,
            needsPassword));
    }

    public async Task<Result<AcceptInviteResponse>> AcceptInviteAsync(AcceptInviteRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return Result<AcceptInviteResponse>.Failure(_localizer["InviteNotFound"]);
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
            return Result<AcceptInviteResponse>.Failure(_localizer["NameRequired"]);
        if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 6)
            return Result<AcceptInviteResponse>.Failure(_localizer["PasswordTooShort"]);

        var member = await _context.OrganizationMembers
            .Include(m => m.Organization)
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.InviteToken == request.Token && !m.IsDeleted, cancellationToken);

        if (member is null || member.InviteAcceptedAt is not null)
            return Result<AcceptInviteResponse>.Failure(_localizer["InviteNotFound"]);

        if (member.InviteExpiresAt is { } exp && exp < DateTime.UtcNow)
            return Result<AcceptInviteResponse>.Failure(_localizer["InviteExpired"]);

        var user = member.User;
        var now = DateTime.UtcNow;
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        user.IsEmailVerified = true;
        user.EmailVerifiedAt = now;
        user.UpdatedAt = now;

        // Default global role: OrgTeacher gets Instructor, everyone else Student. Admins promote later as needed.
        var targetRoleName = member.Role == OrgMemberRole.OrgTeacher ? "Instructor" : "Student";
        var targetRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == targetRoleName && !r.IsDeleted, cancellationToken);
        if (targetRole is not null)
        {
            var alreadyHasRole = await _context.UserRoles
                .AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == targetRole.Id && !ur.IsDeleted, cancellationToken);
            if (!alreadyHasRole)
            {
                _context.UserRoles.Add(new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = targetRole.Id,
                    AssignedAt = now
                });
            }
        }

        member.InviteAcceptedAt = now;
        member.InviteToken = null; // single-use
        member.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Invite accepted: user {UserId} joined org {OrgId}", user.Id, member.OrganizationId);
        return Result<AcceptInviteResponse>.Success(new AcceptInviteResponse(
            user.Id, user.Email, member.OrganizationId, member.Organization.Slug));
    }

    private static string GenerateInviteToken() => Convert.ToHexString(Guid.NewGuid().ToByteArray()) + Convert.ToHexString(Guid.NewGuid().ToByteArray());

    private static string BuildInviteEmailText(string orgName, OrgMemberRole role, string link, int days) =>
        $"You've been invited to join {orgName} on AcademiX as {role}.\n\n" +
        $"Accept your invite and set a password:\n{link}\n\n" +
        $"This link expires in {days} days.\n\n— AcademiX";

    private static string BuildInviteEmailHtml(string orgName, OrgMemberRole role, string link, int days)
    {
        var safeOrg = System.Net.WebUtility.HtmlEncode(orgName);
        return $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, Segoe UI, sans-serif; color: #0f172a; line-height: 1.6; background:#f8fafc; padding:16px;"">
  <div style=""max-width:600px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; border:1px solid #e2e8f0;"">
    <h1 style=""margin:0 0 12px; font-size:22px;"">You're invited to {safeOrg}</h1>
    <p style=""margin:0 0 16px;"">Your role will be <strong>{role}</strong>.</p>
    <p><a href=""{link}"" style=""display:inline-block; padding:12px 24px; background:#3b82f6; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;"">Accept invite &amp; set password</a></p>
    <p style=""margin:16px 0 0; color:#64748b; font-size:13px;"">Or copy this link into your browser:<br><a href=""{link}"" style=""color:#3b82f6; word-break:break-all;"">{link}</a></p>
    <p style=""margin:24px 0 0; color:#94a3b8; font-size:12px;"">This invitation expires in {days} days.</p>
  </div>
</body></html>";
    }
}
