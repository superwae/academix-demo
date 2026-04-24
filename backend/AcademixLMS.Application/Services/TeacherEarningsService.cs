using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.Application.Services;

public class TeacherEarningsService : ITeacherEarningsService
{
    private readonly IApplicationDbContext _context;

    public TeacherEarningsService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<TeacherEarningsSummaryDto>> GetMonthlySummaryAsync(Guid teacherUserId, int? year, int? month, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;

        if (m < 1 || m > 12) return Result<TeacherEarningsSummaryDto>.Failure("Invalid month.");

        var start = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var allPayments = _context.Payments
            .Include(p => p.Course)
            .Where(p => p.Type == PaymentType.CoursePurchase
                     && p.Status == PaymentStatus.Completed
                     && !p.IsDeleted
                     && p.InstructorUserId == teacherUserId);

        var monthlyPayments = await allPayments
            .Where(p => p.PaidAt >= start && p.PaidAt < end)
            .ToListAsync(cancellationToken);

        var lifetime = await allPayments
            .Select(p => new { p.Amount, p.InstructorAmount })
            .ToListAsync(cancellationToken);

        // Convert long minor-units (we persist Amount as price*100) back to decimal.
        decimal ToDecimal(long? amt) => amt.HasValue ? amt.Value / 100m : 0m;

        var gross = monthlyPayments.Sum(p => ToDecimal(p.Amount));
        var platform = monthlyPayments.Sum(p => ToDecimal(p.PlatformAmount));
        var org = monthlyPayments.Sum(p => ToDecimal(p.OrgAmount));
        var net = monthlyPayments.Sum(p => ToDecimal(p.InstructorAmount));

        var courses = monthlyPayments
            .Where(p => p.CourseId.HasValue)
            .GroupBy(p => new { p.CourseId, Title = p.Course?.Title ?? "?" })
            .Select(g => new CourseEarningsRowDto(
                g.Key.CourseId!.Value,
                g.Key.Title,
                g.Count(),
                g.Sum(p => ToDecimal(p.Amount)),
                g.Sum(p => ToDecimal(p.InstructorAmount))))
            .OrderByDescending(c => c.NetEarned)
            .ToList();

        var lifetimeGross = lifetime.Sum(p => ToDecimal(p.Amount));
        var lifetimeNet = lifetime.Sum(p => ToDecimal(p.InstructorAmount));

        // For now, unpaid balance = everything up to (but not including) the last day of the
        // current month. Production would subtract already-processed payouts.
        var endOfCurrentMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
        var unpaid = lifetime.Sum(p => ToDecimal(p.InstructorAmount));
        _ = endOfCurrentMonth;

        var dto = new TeacherEarningsSummaryDto(
            y, m, "ILS",
            gross, platform, org, net,
            monthlyPayments.Count,
            courses,
            lifetimeGross, lifetimeNet,
            unpaid);

        return Result<TeacherEarningsSummaryDto>.Success(dto);
    }
}
