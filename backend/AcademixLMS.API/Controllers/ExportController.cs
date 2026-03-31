using System.Text;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.AI;
using AcademixLMS.Application.DTOs.User;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize(Policy = "RequireAdmin")]
[Tags("Export")]
public class ExportController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger<ExportController> _logger;

    public ExportController(IUserService userService, IAnalyticsService analyticsService, ILogger<ExportController> logger)
    {
        _userService = userService;
        _analyticsService = analyticsService;
        _logger = logger;
    }

    /// <summary>
    /// Export users list as CSV.
    /// </summary>
    [HttpGet("users/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportUsersCsv(CancellationToken cancellationToken)
    {
        var result = await _userService.GetPagedAsync(new PagedRequest { PageNumber = 1, PageSize = 10000 }, cancellationToken);
        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error ?? "Failed to load users.");

        var csv = BuildUsersCsv(result.Value.Items);
        var bytes = Encoding.UTF8.GetBytes(csv);
        var fileName = $"users-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        _logger.LogInformation("Users export downloaded by admin");
        return File(bytes, "text/csv", fileName);
    }

    /// <summary>
    /// Export at-risk students as CSV.
    /// </summary>
    [HttpGet("at-risk-students/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportAtRiskStudentsCsv(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetAtRiskStudentsAsync(null, 5000, cancellationToken);
        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error ?? "Failed to load at-risk students.");

        var csv = BuildAtRiskStudentsCsv(result.Value);
        var bytes = Encoding.UTF8.GetBytes(csv);
        var fileName = $"at-risk-students-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        _logger.LogInformation("At-risk students export downloaded by admin");
        return File(bytes, "text/csv", fileName);
    }

    private static string BuildUsersCsv(IEnumerable<UserDto> users)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Id,Email,FirstName,LastName,FullName,PhoneNumber,IsActive,IsEmailVerified,Roles,CreatedAt");
        foreach (var u in users)
        {
            var roles = string.Join(";", u.Roles ?? new List<string>());
            var line = $"{Escape(u.Id.ToString())},{Escape(u.Email)},{Escape(u.FirstName)},{Escape(u.LastName)},{Escape(u.FullName)},{Escape(u.PhoneNumber ?? "")},{u.IsActive},{u.IsEmailVerified},{Escape(roles)},{u.CreatedAt:O}";
            sb.AppendLine(line);
        }
        return sb.ToString();
    }

    private static string BuildAtRiskStudentsCsv(IEnumerable<StudentAnalyticsDto> students)
    {
        var sb = new StringBuilder();
        sb.AppendLine("UserId,StudentName,Email,RiskLevel,RiskScore,EngagementScore,CompletionRate,AverageGrade,TotalEnrollments,LastActivityAt,RiskFactors");
        foreach (var s in students)
        {
            var factors = string.Join(";", s.RiskFactors ?? new List<string>());
            var line = $"{Escape(s.UserId.ToString())},{Escape(s.StudentName)},{Escape(s.Email)},{s.RiskLevel},{s.RiskScore},{s.EngagementScore},{s.CompletionRate},{s.AverageGrade},{s.TotalEnrollments},{s.LastActivityAt?.ToString("O") ?? ""},{Escape(factors)}";
            sb.AppendLine(line);
        }
        return sb.ToString();
    }

    private static string Escape(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        return value;
    }
}
