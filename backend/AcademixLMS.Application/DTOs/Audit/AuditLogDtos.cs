using AcademixLMS.Application.Common;

namespace AcademixLMS.Application.DTOs.Audit;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class AuditLogSummaryDto
{
    public int TotalEvents { get; set; }
    public int TodayEvents { get; set; }
    public int FailedActions { get; set; }
}

public class AuditLogFilterRequest
{
    public string? Category { get; set; }
    public string? Status { get; set; }
}

public class AuditLogCreateDto
{
    public string Action { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public Guid? ActorUserId { get; set; }
    public string Target { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Status { get; set; } = "success";
    public int? StatusCode { get; set; }
    public string? CorrelationId { get; set; }
    public long? DurationMs { get; set; }
}
