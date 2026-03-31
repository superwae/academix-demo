using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Message entity for user-to-user messaging
/// </summary>
public class Message : BaseEntity
{
    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }
    public Guid? CourseId { get; set; } // Nullable - can be general message
    
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public bool IsArchived { get; set; } = false;
    
    // Navigation Properties
    public User FromUser { get; set; } = null!;
    public User ToUser { get; set; } = null!;
    public Course? Course { get; set; }
}


