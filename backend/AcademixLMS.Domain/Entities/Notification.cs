using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty; // assignment, exam, announcement, grade, message, deadline
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public string? Data { get; set; } // JSON for extra data
    public DateTime? ExpiresAt { get; set; }

    public User User { get; set; } = null!;
}
