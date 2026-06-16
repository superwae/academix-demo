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

/// <summary>
/// Billing interval for subscription plans
/// </summary>
public enum BillingInterval
{
    Monthly = 1,
    Yearly = 2
}

/// <summary>
/// Subscription status
/// </summary>
public enum SubscriptionStatus
{
    Active = 1,
    PastDue = 2,
    Cancelled = 3,
    Expired = 4,
    Trialing = 5
}

/// <summary>
/// Payment status
/// </summary>
public enum PaymentStatus
{
    Pending = 1,
    Completed = 2,
    Failed = 3,
    Refunded = 4,
    PartiallyRefunded = 5
}

/// <summary>
/// Payment type
/// </summary>
public enum PaymentType
{
    CoursePurchase = 1,
    Subscription = 2,
    Refund = 3,
    OrganizationBulkLicense = 4
}

/// <summary>
/// Discount type
/// </summary>
public enum DiscountType
{
    Percentage = 1,
    FixedAmount = 2
}

/// <summary>
/// Organization archetype.
/// TeachingInstitution — owns instructors selling public courses. Revenue split applies.
/// Employer — owns employees; buys seats (CourseLicense) or creates exclusive internal courses.
/// </summary>
public enum OrganizationType
{
    TeachingInstitution = 1,
    Employer = 2
}

/// <summary>
/// Role a user holds inside a specific organization. Distinct from global platform roles.
/// </summary>
public enum OrgMemberRole
{
    /// <summary>Full control of the org (billing, members, courses). Usually the founder / HR head.</summary>
    OrgAdmin = 1,

    /// <summary>HR/training manager (Type B). Can assign licenses and see compliance; cannot change billing.</summary>
    OrgManager = 2,

    /// <summary>Teacher employed by a TeachingInstitution. Creates courses under the org.</summary>
    OrgTeacher = 3,

    /// <summary>Employee of an Employer org. Learner owned by the org.</summary>
    OrgEmployee = 4,

    /// <summary>Student enrolled under a TeachingInstitution. Can see/enroll in org-exclusive courses.</summary>
    OrgStudent = 5
}

/// <summary>
/// Lifecycle state of a bulk course license.
/// </summary>
public enum CourseLicenseStatus
{
    Pending = 1,   // checkout not completed
    Active = 2,    // paid; seats can be assigned
    Expired = 3,   // past ValidUntil
    Revoked = 4    // manually revoked (refund, dispute)
}

/// <summary>Support ticket classification to help admins triage.</summary>
public enum SupportTicketCategory
{
    Billing = 1,
    Technical = 2,
    Course = 3,
    Account = 4,
    Feedback = 5,
    Other = 99
}

public enum SupportTicketStatus
{
    Open = 1,
    InProgress = 2,
    WaitingOnUser = 3,
    Resolved = 4,
    Closed = 5
}

public enum SupportTicketPriority
{
    Low = 1,
    Normal = 2,
    High = 3,
    Urgent = 4
}
