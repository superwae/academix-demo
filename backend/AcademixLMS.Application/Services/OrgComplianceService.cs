using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.Application.Services;

public class OrgComplianceService : IOrgComplianceService
{
    private readonly IApplicationDbContext _context;

    public OrgComplianceService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<OrgComplianceSummaryDto>> GetSummaryAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        if (!await IsOrgReaderAsync(orgId, requestingUserId, cancellationToken))
            return Result<OrgComplianceSummaryDto>.Failure("Not authorized.");

        var now = DateTime.UtcNow;

        var q = _context.Enrollments.Where(e => e.AssignedByOrgId == orgId && !e.IsDeleted);
        var total = await q.CountAsync(cancellationToken);

        if (total == 0)
        {
            return Result<OrgComplianceSummaryDto>.Success(new OrgComplianceSummaryDto(0, 0, 0, 0, 0, 0, 0));
        }

        var completed = await q.CountAsync(e => e.CompletedAt != null, cancellationToken);
        var active = await q.CountAsync(e => e.CompletedAt == null && e.Status == EnrollmentStatus.Active, cancellationToken);
        var overdue = await q.CountAsync(e => e.CompletedAt == null && e.DueDate != null && e.DueDate < now, cancellationToken);
        var unique = await q.Select(e => e.UserId).Distinct().CountAsync(cancellationToken);
        var avgProgress = await q.AverageAsync(e => (double?)e.ProgressPercentage, cancellationToken) ?? 0;

        var completion = total == 0 ? 0m : Math.Round((decimal)completed * 100m / total, 1);

        return Result<OrgComplianceSummaryDto>.Success(new OrgComplianceSummaryDto(
            total,
            active,
            completed,
            overdue,
            unique,
            (decimal)Math.Round(avgProgress, 1),
            completion));
    }

    public async Task<Result<IReadOnlyList<OrgAssignmentRowDto>>> GetAssignmentsAsync(Guid orgId, Guid requestingUserId, string? statusFilter, CancellationToken cancellationToken = default)
    {
        if (!await IsOrgReaderAsync(orgId, requestingUserId, cancellationToken))
            return Result<IReadOnlyList<OrgAssignmentRowDto>>.Failure("Not authorized.");

        var now = DateTime.UtcNow;

        IQueryable<Domain.Entities.Enrollment> q = _context.Enrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .Where(e => e.AssignedByOrgId == orgId && !e.IsDeleted);

        q = statusFilter?.ToLowerInvariant() switch
        {
            "completed" => q.Where(e => e.CompletedAt != null),
            "active"    => q.Where(e => e.CompletedAt == null && e.Status == EnrollmentStatus.Active),
            "overdue"   => q.Where(e => e.CompletedAt == null && e.DueDate != null && e.DueDate < now),
            _           => q,
        };

        var rows = await q
            .OrderByDescending(e => e.EnrolledAt)
            .Select(e => new OrgAssignmentRowDto(
                e.Id, e.UserId, e.User.FirstName + " " + e.User.LastName, e.User.Email,
                e.CourseId, e.Course.Title, e.CourseLicenseId,
                e.EnrolledAt, e.DueDate, e.ProgressPercentage, e.CompletedAt,
                e.CompletedAt == null && e.DueDate != null && e.DueDate < now,
                e.Status.ToString()))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<OrgAssignmentRowDto>>.Success(rows);
    }

    private async Task<bool> IsOrgReaderAsync(Guid orgId, Guid userId, CancellationToken cancellationToken) =>
        await _context.OrganizationMembers.AnyAsync(m =>
            m.OrganizationId == orgId && m.UserId == userId && m.IsActive && !m.IsDeleted &&
            (m.Role == OrgMemberRole.OrgAdmin || m.Role == OrgMemberRole.OrgManager), cancellationToken);
}
