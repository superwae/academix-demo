using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;

namespace AcademixLMS.Application.Interfaces;

public interface IOrganizationService
{
    Task<Result<IReadOnlyList<OrganizationSummaryDto>>> GetMyOrganizationsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<OrganizationDto>> GetByIdAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<Result<OrganizationDto>> GetBySlugAsync(string slug, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<OrganizationDto>>> GetAllForAdminAsync(CancellationToken cancellationToken = default);

    Task<Result<OrganizationDto>> CreateAsync(Guid ownerUserId, CreateOrganizationRequest request, CancellationToken cancellationToken = default);
    Task<Result<OrganizationDto>> UpdateAsync(Guid orgId, Guid requestingUserId, UpdateOrganizationRequest request, CancellationToken cancellationToken = default);

    // Members
    Task<Result<IReadOnlyList<OrganizationMemberDto>>> GetMembersAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<Result<OrganizationMemberDto>> InviteMemberAsync(Guid orgId, Guid requestingUserId, InviteMemberRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<OrganizationMemberDto>>> BulkInviteMembersAsync(Guid orgId, Guid requestingUserId, BulkInviteMembersRequest request, CancellationToken cancellationToken = default);
    Task<Result<OrganizationMemberDto>> UpdateMemberRoleAsync(Guid orgId, Guid memberId, Guid requestingUserId, UpdateMemberRoleRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> RemoveMemberAsync(Guid orgId, Guid memberId, Guid requestingUserId, CancellationToken cancellationToken = default);
}
