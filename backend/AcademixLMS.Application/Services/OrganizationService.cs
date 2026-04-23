using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using System.Text;

namespace AcademixLMS.Application.Services;

public class OrganizationService : IOrganizationService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<OrganizationService> _logger;
    private readonly IStringLocalizer<OrganizationService> _localizer;

    public OrganizationService(
        IApplicationDbContext context,
        ILogger<OrganizationService> logger,
        IStringLocalizer<OrganizationService> localizer)
    {
        _context = context;
        _logger = logger;
        _localizer = localizer;
    }

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

        var member = new OrganizationMember
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgId,
            UserId = userId,
            Role = request.Role,
            JoinedAt = DateTime.UtcNow,
            IsActive = true,
            ExternalReference = request.ExternalReference,
            InviteToken = userWasNew ? GenerateInviteToken() : null,
            InviteSentAt = DateTime.UtcNow,
            InviteAcceptedAt = userWasNew ? null : DateTime.UtcNow,
            CreatedBy = requestingUserId
        };
        _context.OrganizationMembers.Add(member);

        await _context.SaveChangesAsync(cancellationToken);

        var user = await _context.Users.FirstAsync(u => u.Id == userId, cancellationToken);
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

    private static string GenerateInviteToken() => Convert.ToHexString(Guid.NewGuid().ToByteArray()) + Convert.ToHexString(Guid.NewGuid().ToByteArray());
}
