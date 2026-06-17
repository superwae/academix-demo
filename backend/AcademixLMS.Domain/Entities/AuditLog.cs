using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Persisted platform audit event shown in the admin audit log.
/// </summary>
public class AuditLog : BaseEntity
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
