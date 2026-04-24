namespace AcademixLMS.Application.DTOs.Payment;

public record TeacherEarningsSummaryDto(
    int Year,
    int Month,
    string Currency,
    decimal GrossSales,
    decimal PlatformCut,
    decimal OrgCut,
    decimal NetEarned,
    int SalesCount,
    IReadOnlyList<CourseEarningsRowDto> Courses,
    decimal LifetimeGrossSales,
    decimal LifetimeNetEarned,
    decimal UnpaidBalance);

public record CourseEarningsRowDto(
    Guid CourseId,
    string CourseTitle,
    int SalesCount,
    decimal GrossSales,
    decimal NetEarned);
