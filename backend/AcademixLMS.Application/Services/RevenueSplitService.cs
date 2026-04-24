using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AcademixLMS.Application.Services;

public class RevenueSplitService : IRevenueSplitService
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public RevenueSplitService(IApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private decimal GlobalDefaultPlatformPercent =>
        _configuration.GetValue<decimal?>("Payments:PlatformFeePercent") ?? 15m;

    public async Task<Result<RevenueSplitPreviewDto>> PreviewForCourseAsync(Guid courseId, decimal? priceOverride, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Organization)
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course is null)
            return Result<RevenueSplitPreviewDto>.Failure("Course not found.");

        var price = priceOverride ?? course.Price ?? 0m;
        return Result<RevenueSplitPreviewDto>.Success(Build(price, course.Instructor, course.Organization));
    }

    public async Task<Result<RevenueSplitPreviewDto>> PreviewForInstructorAsync(Guid? instructorUserId, Guid? organizationId, decimal price, CancellationToken cancellationToken = default)
    {
        User? instructor = null;
        Organization? org = null;

        if (instructorUserId.HasValue)
            instructor = await _context.Users.FirstOrDefaultAsync(u => u.Id == instructorUserId.Value && !u.IsDeleted, cancellationToken);
        if (organizationId.HasValue)
            org = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == organizationId.Value && !o.IsDeleted, cancellationToken);

        return Result<RevenueSplitPreviewDto>.Success(Build(price, instructor, org));
    }

    public async Task<Result<(long PlatformAmount, long OrgAmount, long InstructorAmount)>> ComputeForPaymentAsync(Guid courseId, long amount, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Organization)
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);
        if (course is null) return Result<(long, long, long)>.Failure("Course not found.");

        var (platformPct, orgPct) = ResolvePercents(course.Instructor, course.Organization);
        var instructorPct = Math.Max(0m, 100m - platformPct - orgPct);

        // Split the raw integer amount using largest-remainder so we round without losing pennies.
        var platform = Floor(amount, platformPct);
        var org = Floor(amount, orgPct);
        var instructor = amount - platform - org;
        if (instructor < 0)
        {
            // Over-100% edge case — trim platform last so the instructor never goes negative.
            var overflow = -instructor;
            platform = Math.Max(0, platform - overflow);
            instructor = amount - platform - org;
        }
        _ = instructorPct;
        return Result<(long, long, long)>.Success((platform, org, instructor));
    }

    // ---- internals ----

    private (decimal PlatformPercent, decimal OrgPercent) ResolvePercents(User? instructor, Organization? org)
    {
        decimal platformPct;
        if (org is { Type: OrganizationType.TeachingInstitution })
        {
            platformPct = Math.Clamp(org.PlatformFeePercent, 0m, 100m);
        }
        else if (instructor?.PlatformFeePercentOverride is { } overridePct)
        {
            platformPct = Math.Clamp(overridePct, 0m, 100m);
        }
        else
        {
            platformPct = Math.Clamp(GlobalDefaultPlatformPercent, 0m, 100m);
        }

        var orgPct = org is { Type: OrganizationType.TeachingInstitution }
            ? Math.Clamp(org.OrgFeePercent, 0m, 100m)
            : 0m;

        if (platformPct + orgPct > 100m) orgPct = Math.Max(0m, 100m - platformPct);
        return (platformPct, orgPct);
    }

    private RevenueSplitPreviewDto Build(decimal price, User? instructor, Organization? org)
    {
        var (platformPct, orgPct) = ResolvePercents(instructor, org);
        var instructorPct = Math.Max(0m, 100m - platformPct - orgPct);

        var parts = new List<RevenueSplitPartDto>();
        if (platformPct > 0m)
            parts.Add(new RevenueSplitPartDto(RevenuePartyKind.Platform, "Platform", platformPct, Round(price * platformPct / 100m)));
        if (orgPct > 0m && org is not null)
            parts.Add(new RevenueSplitPartDto(RevenuePartyKind.Organization, org.Name, orgPct, Round(price * orgPct / 100m)));
        if (instructorPct > 0m)
            parts.Add(new RevenueSplitPartDto(
                RevenuePartyKind.Instructor,
                instructor is null ? "Instructor" : (instructor.FirstName + " " + instructor.LastName).Trim(),
                instructorPct,
                Round(price * instructorPct / 100m)));

        return new RevenueSplitPreviewDto(price, "ILS", parts);
    }

    private static decimal Round(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    private static long Floor(long total, decimal percent)
    {
        if (percent <= 0m) return 0;
        // Truncate to favor assigning remainders to the instructor (the "remainder" payee).
        return (long)Math.Floor((decimal)total * percent / 100m);
    }
}
