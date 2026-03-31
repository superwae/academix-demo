using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;

namespace AcademixLMS.Application.Interfaces;

public interface ICertificateService
{
    Task<Result<CertificateDto>> GetCertificateAsync(Guid courseId, Guid userId, CancellationToken cancellationToken = default);
}
