using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Course section - represents a specific class instance with schedule
/// </summary>
public class CourseSection : BaseEntity
{
    public Guid CourseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LocationLabel { get; set; } = string.Empty;
    public string? JoinUrl { get; set; }
    
    public int MaxSeats { get; set; }
    public int SeatsRemaining { get; set; }
    public bool IsActive { get; set; } = true;
    
    // Navigation Properties
    public Course Course { get; set; } = null!;
    public ICollection<SectionMeetingTime> MeetingTimes { get; set; } = new List<SectionMeetingTime>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}

/// <summary>
/// Meeting time for a course section
/// </summary>
public class SectionMeetingTime : BaseEntity
{
    public Guid SectionId { get; set; }
    public Common.DayOfWeek Day { get; set; }
    public int StartMinutes { get; set; } // Minutes from 00:00 (e.g., 600 = 10:00 AM)
    public int EndMinutes { get; set; }
    
    // Navigation Properties
    public CourseSection Section { get; set; } = null!;
    public ICollection<MeetingTimeRating> Ratings { get; set; } = new List<MeetingTimeRating>();
}

