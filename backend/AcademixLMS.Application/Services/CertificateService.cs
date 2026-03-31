using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class CertificateService : ICertificateService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CertificateService> _logger;

    public CertificateService(IApplicationDbContext context, ILogger<CertificateService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<CertificateDto>> GetCertificateAsync(
        Guid courseId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var enrollment = await _context.Enrollments
            .AsNoTracking()
            .Include(e => e.Course)
            .ThenInclude(c => c.Instructor)
            .Include(e => e.User)
            .Where(e => e.UserId == userId && e.CourseId == courseId && !e.IsDeleted)
            .OrderByDescending(e => e.CompletedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (enrollment == null)
            return Result<CertificateDto>.Failure("You are not enrolled in this course.");

        if (enrollment.Status != EnrollmentStatus.Completed)
        {
            return Result<CertificateDto>.Success(new CertificateDto
            {
                Eligible = false,
                StudentName = $"{enrollment.User.FirstName} {enrollment.User.LastName}".Trim(),
                CourseTitle = enrollment.Course.Title,
                CourseDescription = ResolveCertificateDescription(enrollment.Course),
                ExpectedDurationHours = ResolveCertificateHours(enrollment.Course),
                InstructorName = $"{enrollment.Course.Instructor.FirstName} {enrollment.Course.Instructor.LastName}".Trim(),
                CompletedAt = enrollment.CompletedAt,
                IssuedAt = DateTime.UtcNow,
                CertificateId = string.Empty
            });
        }

        var issued = enrollment.CompletedAt ?? DateTime.UtcNow;
        var certId = $"ACX-{enrollment.Id:N}".ToUpperInvariant();

        return Result<CertificateDto>.Success(new CertificateDto
        {
            Eligible = true,
            StudentName = $"{enrollment.User.FirstName} {enrollment.User.LastName}".Trim(),
            CourseTitle = enrollment.Course.Title,
            CourseDescription = ResolveCertificateDescription(enrollment.Course),
            ExpectedDurationHours = ResolveCertificateHours(enrollment.Course),
            InstructorName = $"{enrollment.Course.Instructor.FirstName} {enrollment.Course.Instructor.LastName}".Trim(),
            CompletedAt = enrollment.CompletedAt,
            IssuedAt = issued,
            CertificateId = certId
        });
    }

    /// <summary>When <see cref="Course.IssueCertificates"/> is set, use certificate copy; otherwise catalog description.</summary>
    private static string? ResolveCertificateDescription(Course course)
    {
        if (course.IssueCertificates)
        {
            if (!string.IsNullOrWhiteSpace(course.CertificateSummary))
                return course.CertificateSummary.Trim();
            return null;
        }

        return string.IsNullOrWhiteSpace(course.Description)
            ? null
            : course.Description.Trim();
    }

    private static decimal? ResolveCertificateHours(Course course)
    {
        if (course.IssueCertificates)
            return course.CertificateDisplayHours ?? course.ExpectedDurationHours;
        return course.ExpectedDurationHours;
    }
}
