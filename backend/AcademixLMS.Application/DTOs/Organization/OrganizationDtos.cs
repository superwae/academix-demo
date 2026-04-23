using AcademixLMS.Domain.Common;

namespace AcademixLMS.Application.DTOs.Organization;

public record OrganizationDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? LogoUrl,
    string? Website,
    string? ContactEmail,
    OrganizationType Type,
    Guid OwnerUserId,
    string OwnerName,
    string OwnerEmail,
    decimal PlatformFeePercent,
    decimal OrgFeePercent,
    bool IsActive,
    int MemberCount,
    int CourseCount,
    int LicenseCount,
    DateTime CreatedAt);

public record OrganizationSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    OrganizationType Type,
    string? LogoUrl,
    OrgMemberRole RoleInOrg);

public record OrganizationMemberDto(
    Guid Id,
    Guid OrganizationId,
    Guid UserId,
    string FirstName,
    string LastName,
    string Email,
    string? ProfilePictureUrl,
    OrgMemberRole Role,
    string? ExternalReference,
    DateTime JoinedAt,
    DateTime? LeftAt,
    bool IsActive,
    bool InviteAccepted);

public record CreateOrganizationRequest(
    string Name,
    OrganizationType Type,
    string? Description,
    string? Website,
    string? ContactEmail);

public record UpdateOrganizationRequest(
    string Name,
    string? Description,
    string? Website,
    string? ContactEmail,
    string? LogoUrl,
    decimal PlatformFeePercent,
    decimal OrgFeePercent);

public record InviteMemberRequest(
    string Email,
    OrgMemberRole Role,
    string? ExternalReference);

public record BulkInviteMembersRequest(
    IReadOnlyList<InviteMemberRequest> Members);

public record UpdateMemberRoleRequest(
    OrgMemberRole Role);
