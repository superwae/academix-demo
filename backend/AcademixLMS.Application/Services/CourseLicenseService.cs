using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Organization;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class CourseLicenseService : ICourseLicenseService
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CourseLicenseService> _logger;
    private readonly IStringLocalizer<CourseLicenseService> _localizer;

    public CourseLicenseService(
        IApplicationDbContext context,
        IConfiguration configuration,
        ILogger<CourseLicenseService> logger,
        IStringLocalizer<CourseLicenseService> localizer)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _localizer = localizer;
    }

    public async Task<Result<IReadOnlyList<CourseLicenseDto>>> GetLicensesForOrgAsync(Guid orgId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        if (!await IsOrgAdminOrManagerAsync(orgId, requestingUserId, cancellationToken))
            return Result<IReadOnlyList<CourseLicenseDto>>.Failure(_localizer["NotAuthorizedOrg"]);

        var licenses = await _context.CourseLicenses
            .Include(l => l.Course)
            .Where(l => l.OrganizationId == orgId && !l.IsDeleted)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => Map(l))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<CourseLicenseDto>>.Success(licenses);
    }

    public async Task<Result<CourseLicenseDto>> GetByIdAsync(Guid licenseId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var license = await LoadAsync(licenseId, cancellationToken);
        if (license is null) return Result<CourseLicenseDto>.Failure(_localizer["LicenseNotFound"]);
        if (!await IsOrgAdminOrManagerAsync(license.OrganizationId, requestingUserId, cancellationToken))
            return Result<CourseLicenseDto>.Failure(_localizer["NotAuthorizedOrg"]);
        return Result<CourseLicenseDto>.Success(Map(license));
    }

    public async Task<Result<CourseLicenseDto>> PurchaseAsync(Guid orgId, Guid requestingUserId, PurchaseLicenseRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Seats <= 0) return Result<CourseLicenseDto>.Failure(_localizer["SeatsMustBePositive"]);
        if (!await IsOrgAdminAsync(orgId, requestingUserId, cancellationToken))
            return Result<CourseLicenseDto>.Failure(_localizer["OnlyAdminsCanPurchase"]);

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);
        if (course is null) return Result<CourseLicenseDto>.Failure(_localizer["CourseNotFound"]);
        if (course.Status != CourseStatus.Published)
            return Result<CourseLicenseDto>.Failure(_localizer["CourseNotPublished"]);
        if (course.IsOrgExclusive && course.OrganizationId != orgId)
            return Result<CourseLicenseDto>.Failure(_localizer["CourseExclusiveToOtherOrg"]);
        if (course.Price is null || course.Price <= 0)
            return Result<CourseLicenseDto>.Failure(_localizer["CourseIsFree"]);

        var pricePerSeat = course.Price.Value;
        var total = pricePerSeat * request.Seats;

        // Instant completion is only valid in demo mode (Payments:DemoMode). With a real
        // gateway this flow must go through Lahza init + verification before activating seats.
        var demoMode = bool.TryParse(_configuration["Payments:DemoMode"], out var dm) && dm;
        if (!demoMode)
            return Result<CourseLicenseDto>.Failure(_localizer["LicensePaymentRequiresGateway"]);

        // Create payment (demo: marks complete immediately. Production: Lahza init + webhook).
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = requestingUserId,
            OrganizationId = orgId,
            CourseId = course.Id,
            Type = PaymentType.OrganizationBulkLicense,
            Status = PaymentStatus.Completed,
            Amount = (long)(total * 100m),
            Currency = "ILS",
            PaidAt = DateTime.UtcNow,
            CreatedBy = requestingUserId
        };
        _context.Payments.Add(payment);

        var license = new CourseLicense
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgId,
            CourseId = course.Id,
            SeatsTotal = request.Seats,
            SeatsUsed = 0,
            PricePerSeat = pricePerSeat,
            TotalAmount = total,
            Currency = "ILS",
            ValidFrom = DateTime.UtcNow,
            ValidUntil = request.ValidUntil ?? DateTime.UtcNow.AddYears(1),
            Status = CourseLicenseStatus.Active,
            CreatedBy = requestingUserId
        };
        _context.CourseLicenses.Add(license);

        payment.CourseLicenseId = license.Id;

        await _context.SaveChangesAsync(cancellationToken);
        license.Course = course;

        _logger.LogInformation("License {LicenseId}: org {OrgId} bought {Seats} seats of {CourseId}", license.Id, orgId, request.Seats, course.Id);
        return Result<CourseLicenseDto>.Success(Map(license));
    }

    public async Task<Result<CourseLicenseDto>> ActivateAsync(Guid licenseId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var license = await LoadAsync(licenseId, cancellationToken);
        if (license is null) return Result<CourseLicenseDto>.Failure(_localizer["LicenseNotFound"]);
        if (!await IsOrgAdminAsync(license.OrganizationId, requestingUserId, cancellationToken))
            return Result<CourseLicenseDto>.Failure(_localizer["NotAuthorized"]);

        if (license.Status == CourseLicenseStatus.Active) return Result<CourseLicenseDto>.Success(Map(license));

        license.Status = CourseLicenseStatus.Active;
        license.ValidFrom ??= DateTime.UtcNow;
        license.UpdatedAt = DateTime.UtcNow;
        license.UpdatedBy = requestingUserId;
        await _context.SaveChangesAsync(cancellationToken);
        return Result<CourseLicenseDto>.Success(Map(license));
    }

    public async Task<Result<IReadOnlyList<LicenseAssignmentDto>>> GetAssignmentsAsync(Guid licenseId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var license = await LoadAsync(licenseId, cancellationToken);
        if (license is null) return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["LicenseNotFound"]);
        if (!await IsOrgAdminOrManagerAsync(license.OrganizationId, requestingUserId, cancellationToken))
            return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["NotAuthorized"]);

        var assignments = await _context.Enrollments
            .Include(e => e.User)
            .Where(e => e.CourseLicenseId == licenseId && !e.IsDeleted)
            .Select(e => new LicenseAssignmentDto(
                e.Id, e.UserId, e.User.FirstName + " " + e.User.LastName, e.User.Email,
                e.EnrolledAt, e.DueDate, e.ProgressPercentage, e.CompletedAt, e.Status.ToString()))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<LicenseAssignmentDto>>.Success(assignments);
    }

    public async Task<Result<IReadOnlyList<LicenseAssignmentDto>>> AssignSeatsAsync(Guid licenseId, Guid requestingUserId, AssignLicenseRequest request, CancellationToken cancellationToken = default)
    {
        var license = await _context.CourseLicenses
            .Include(l => l.Course).ThenInclude(c => c.Sections)
            .FirstOrDefaultAsync(l => l.Id == licenseId && !l.IsDeleted, cancellationToken);
        if (license is null) return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["LicenseNotFound"]);

        if (!await IsOrgAdminOrManagerAsync(license.OrganizationId, requestingUserId, cancellationToken))
            return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["NotAuthorized"]);

        if (license.Status != CourseLicenseStatus.Active)
            return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["LicenseNotActive"]);

        var targetSection = license.Course.Sections.FirstOrDefault(s => !s.IsDeleted && s.IsActive);
        if (targetSection is null)
            return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["NoActiveSection"]);

        var available = license.SeatsTotal - license.SeatsUsed;
        if (request.MemberUserIds.Count > available)
            return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["SeatsAvailableShort", available, request.MemberUserIds.Count]);

        var memberIdsInOrg = await _context.OrganizationMembers
            .Where(m => m.OrganizationId == license.OrganizationId &&
                        request.MemberUserIds.Contains(m.UserId) &&
                        m.IsActive &&
                        m.InviteAcceptedAt != null &&
                        !m.IsDeleted)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

        var missing = request.MemberUserIds.Except(memberIdsInOrg).ToList();
        if (missing.Count > 0)
            return Result<IReadOnlyList<LicenseAssignmentDto>>.Failure(_localizer["UsersNotActiveMembers", missing.Count]);

        // Skip users who are already enrolled in this course (org-assigned or self-assigned)
        var alreadyEnrolledUsers = await _context.Enrollments
            .Where(e => e.CourseId == license.CourseId && memberIdsInOrg.Contains(e.UserId) && e.Status == EnrollmentStatus.Active && !e.IsDeleted)
            .Select(e => e.UserId)
            .ToListAsync(cancellationToken);

        var toEnroll = memberIdsInOrg.Except(alreadyEnrolledUsers).ToList();

        var createdIds = new List<Guid>();
        foreach (var uid in toEnroll)
        {
            var enrollment = new Enrollment
            {
                Id = Guid.NewGuid(),
                UserId = uid,
                CourseId = license.CourseId,
                SectionId = targetSection.Id,
                EnrolledAt = DateTime.UtcNow,
                Status = EnrollmentStatus.Active,
                AssignedByOrgId = license.OrganizationId,
                CourseLicenseId = license.Id,
                DueDate = request.DueDate,
                CreatedBy = requestingUserId
            };
            _context.Enrollments.Add(enrollment);
            createdIds.Add(enrollment.Id);
        }

        license.SeatsUsed += toEnroll.Count;
        license.UpdatedAt = DateTime.UtcNow;
        license.UpdatedBy = requestingUserId;

        await _context.SaveChangesAsync(cancellationToken);

        var created = await _context.Enrollments
            .Include(e => e.User)
            .Where(e => createdIds.Contains(e.Id))
            .Select(e => new LicenseAssignmentDto(
                e.Id, e.UserId, e.User.FirstName + " " + e.User.LastName, e.User.Email,
                e.EnrolledAt, e.DueDate, e.ProgressPercentage, e.CompletedAt, e.Status.ToString()))
            .ToListAsync(cancellationToken);

        _logger.LogInformation("License {LicenseId}: assigned {Count} seats (skipped {Dup} already-enrolled)",
            license.Id, toEnroll.Count, alreadyEnrolledUsers.Count);

        return Result<IReadOnlyList<LicenseAssignmentDto>>.Success(created);
    }

    public async Task<Result<bool>> RevokeAssignmentAsync(Guid licenseId, Guid enrollmentId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var license = await LoadAsync(licenseId, cancellationToken);
        if (license is null) return Result<bool>.Failure(_localizer["LicenseNotFound"]);
        if (!await IsOrgAdminOrManagerAsync(license.OrganizationId, requestingUserId, cancellationToken))
            return Result<bool>.Failure(_localizer["NotAuthorized"]);

        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.Id == enrollmentId && e.CourseLicenseId == licenseId && !e.IsDeleted, cancellationToken);
        if (enrollment is null) return Result<bool>.Failure(_localizer["AssignmentNotFound"]);

        enrollment.Status = EnrollmentStatus.Cancelled;
        enrollment.IsDeleted = true;
        enrollment.DeletedAt = DateTime.UtcNow;
        enrollment.DeletedBy = requestingUserId;

        license.SeatsUsed = Math.Max(0, license.SeatsUsed - 1);
        license.UpdatedAt = DateTime.UtcNow;
        license.UpdatedBy = requestingUserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    // ---- helpers ----

    private async Task<CourseLicense?> LoadAsync(Guid id, CancellationToken cancellationToken) =>
        await _context.CourseLicenses
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, cancellationToken);

    private async Task<bool> IsOrgAdminAsync(Guid orgId, Guid userId, CancellationToken cancellationToken) =>
        await _context.OrganizationMembers.AnyAsync(m =>
            m.OrganizationId == orgId && m.UserId == userId && m.IsActive && !m.IsDeleted &&
            m.Role == OrgMemberRole.OrgAdmin, cancellationToken);

    private async Task<bool> IsOrgAdminOrManagerAsync(Guid orgId, Guid userId, CancellationToken cancellationToken) =>
        await _context.OrganizationMembers.AnyAsync(m =>
            m.OrganizationId == orgId && m.UserId == userId && m.IsActive && !m.IsDeleted &&
            (m.Role == OrgMemberRole.OrgAdmin || m.Role == OrgMemberRole.OrgManager), cancellationToken);

    private static CourseLicenseDto Map(CourseLicense l) => new(
        l.Id, l.OrganizationId, l.CourseId,
        l.Course?.Title ?? string.Empty, l.Course?.ThumbnailUrl,
        l.SeatsTotal, l.SeatsUsed, Math.Max(0, l.SeatsTotal - l.SeatsUsed),
        l.PricePerSeat, l.TotalAmount, l.Currency,
        l.ValidFrom, l.ValidUntil, l.Status, l.CreatedAt);
}
