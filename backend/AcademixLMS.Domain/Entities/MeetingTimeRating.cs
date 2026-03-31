using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>Student rating for a scheduled meeting slot (section meeting time).</summary>
public class MeetingTimeRating : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid SectionMeetingTimeId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }

    public User User { get; set; } = null!;
    public SectionMeetingTime MeetingTime { get; set; } = null!;
}
