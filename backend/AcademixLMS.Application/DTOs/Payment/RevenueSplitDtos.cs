namespace AcademixLMS.Application.DTOs.Payment;

public enum RevenuePartyKind
{
    Platform = 1,
    Organization = 2,
    Instructor = 3
}

public record RevenueSplitPartDto(
    RevenuePartyKind Kind,
    string Label,
    decimal Percent,
    decimal Amount);

public record RevenueSplitPreviewDto(
    decimal Price,
    string Currency,
    IReadOnlyList<RevenueSplitPartDto> Parts);

public record PreviewSplitForCourseRequest(
    Guid CourseId,
    decimal? Price);

public record PreviewSplitForInstructorRequest(
    Guid? InstructorId,
    Guid? OrganizationId,
    decimal Price);
