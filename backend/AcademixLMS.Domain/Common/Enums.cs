namespace AcademixLMS.Domain.Common;

/// <summary>
/// Course difficulty level
/// </summary>
public enum CourseLevel
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3
}

/// <summary>
/// Course delivery modality
/// </summary>
public enum Modality
{
    Online = 1,
    InPerson = 2,
    Hybrid = 3
}

/// <summary>
/// Course provider type
/// </summary>
public enum ProviderType
{
    University = 1,
    School = 2,
    Business = 3
}

/// <summary>
/// Course publication status
/// </summary>
public enum CourseStatus
{
    Draft = 1,
    Published = 2,
    Archived = 3
}

/// <summary>
/// Day of week for scheduling
/// </summary>
public enum DayOfWeek
{
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
    Sunday = 7
}

/// <summary>
/// Enrollment status
/// </summary>
public enum EnrollmentStatus
{
    Active = 1,
    Completed = 2,
    Dropped = 3,
    Suspended = 4,
    Cancelled = 5
}

/// <summary>
/// Assignment status
/// </summary>
public enum AssignmentStatus
{
    Draft = 1,
    Published = 2,
    Closed = 3
}

/// <summary>
/// Exam question type
/// </summary>
public enum QuestionType
{
    MultipleChoice = 1,
    TrueFalse = 2,
    ShortAnswer = 3 // For future implementation
}

/// <summary>
/// Conversation type
/// </summary>
public enum ConversationType
{
    Direct = 1,    // Student to Student (requires approval)
    Course = 2,    // Course chat (all enrolled students + instructor)
    General = 3   // Not implemented yet
}/// <summary>
/// Conversation request status
/// </summary>
public enum ConversationRequestStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3
}