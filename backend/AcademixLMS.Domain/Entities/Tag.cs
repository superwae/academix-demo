using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Tag entity for categorizing courses
/// </summary>
public class Tag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    
    // Navigation Properties
    public ICollection<CourseTag> CourseTags { get; set; } = new List<CourseTag>();
}

/// <summary>
/// Join entity for Course-Tag many-to-many relationship
/// </summary>
public class CourseTag : BaseEntity
{
    public Guid CourseId { get; set; }
    public Guid TagId { get; set; }
    
    // Navigation Properties
    public Course Course { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}


