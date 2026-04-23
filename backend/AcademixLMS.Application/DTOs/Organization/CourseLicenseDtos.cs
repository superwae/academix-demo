using AcademixLMS.Domain.Common;

namespace AcademixLMS.Application.DTOs.Organization;

public record CourseLicenseDto(
    Guid Id,
    Guid OrganizationId,
    Guid CourseId,
    string CourseTitle,
    string? CourseThumbnailUrl,
    int SeatsTotal,
    int SeatsUsed,
    int SeatsAvailable,
    decimal PricePerSeat,
    decimal TotalAmount,
    string Currency,
    DateTime? ValidFrom,
    DateTime? ValidUntil,
    CourseLicenseStatus Status,
    DateTime CreatedAt);

public record PurchaseLicenseRequest(
    Guid CourseId,
    int Seats,
    DateTime? ValidUntil);

public record AssignLicenseRequest(
    IReadOnlyList<Guid> MemberUserIds,
    DateTime? DueDate);

public record LicenseAssignmentDto(
    Guid EnrollmentId,
    Guid UserId,
    string UserName,
    string Email,
    DateTime EnrolledAt,
    DateTime? DueDate,
    decimal ProgressPercentage,
    DateTime? CompletedAt,
    string Status);

public record OrgComplianceSummaryDto(
    int TotalAssignments,
    int ActiveAssignments,
    int CompletedAssignments,
    int OverdueAssignments,
    int UniqueLearners,
    decimal AverageProgressPercent,
    decimal CompletionRatePercent);

public record OrgAssignmentRowDto(
    Guid EnrollmentId,
    Guid UserId,
    string UserName,
    string UserEmail,
    Guid CourseId,
    string CourseTitle,
    Guid? CourseLicenseId,
    DateTime EnrolledAt,
    DateTime? DueDate,
    decimal ProgressPercentage,
    DateTime? CompletedAt,
    bool IsOverdue,
    string Status);
