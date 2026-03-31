using AcademixLMS.API.Extensions;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/courses/{courseId:guid}/certificate")]
[ApiVersion("1.0")]
[Authorize(Policy = "RequireStudent")]
[Tags("3. Courses")]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _certificates;

    public CertificatesController(ICertificateService certificates)
    {
        _certificates = certificates;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CertificateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCertificate(Guid courseId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _certificates.GetCertificateAsync(courseId, userId, cancellationToken);
        if (!result.IsSuccess)
            return NotFound(result.Error);
        return Ok(result.Value);
    }
}
