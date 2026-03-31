using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Review - represents a student's review and rating of a course
/// </summary>
public class Review : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    
    public int Rating { get; set; } // 1-5 stars
    public string? Comment { get; set; } // Optional review text
    
    public bool IsVisible { get; set; } = true; // Visibility control
    public bool IsVerified { get; set; } = false; // Verified purchase/enrollment
    
    // Navigation Properties
    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
}






















