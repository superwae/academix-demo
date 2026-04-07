using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// User entity representing all users in the system (Students, Instructors, Admins, etc.)
/// </summary>
public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? ProfilePictureUrl { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool IsEmailVerified { get; set; } = false;
    public DateTime? EmailVerifiedAt { get; set; }
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiresAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Short biography / about text.</summary>
    public string? Bio { get; set; }

    /// <summary>Cover/banner image URL for the profile page.</summary>
    public string? CoverImageUrl { get; set; }

    /// <summary>JSON blob for UI preferences (theme, colors). Synced across devices.</summary>
    public string? UiPreferencesJson { get; set; }
    
    // Navigation Properties
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<AssignmentSubmission> Submissions { get; set; } = new List<AssignmentSubmission>();
    public ICollection<ExamAttempt> ExamAttempts { get; set; } = new List<ExamAttempt>();
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<Message> ReceivedMessages { get; set; } = new List<Message>();
    public ICollection<Course> InstructedCourses { get; set; } = new List<Course>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    
    // Messaging Navigation Properties
    public ICollection<ConversationParticipant> ConversationParticipants { get; set; } = new List<ConversationParticipant>();
    public ICollection<ConversationMessage> SentConversationMessages { get; set; } = new List<ConversationMessage>();
    public ICollection<ConversationRequest> SentRequests { get; set; } = new List<ConversationRequest>();
    public ICollection<ConversationRequest> ReceivedRequests { get; set; } = new List<ConversationRequest>();
    public ICollection<BlockedUser> BlockedUsers { get; set; } = new List<BlockedUser>();
    public ICollection<BlockedUser> BlockedByUsers { get; set; } = new List<BlockedUser>();
    public ICollection<ReportedUser> ReportedUsers { get; set; } = new List<ReportedUser>();
    public ICollection<ReportedUser> ReportedByUsers { get; set; } = new List<ReportedUser>();

    // User Interests & Learning Goals (for AI Recommendations)
    public ICollection<UserInterest> Interests { get; set; } = new List<UserInterest>();
    public ICollection<UserLearningGoal> LearningGoals { get; set; } = new List<UserLearningGoal>();

    // Helper properties
    public string FullName => $"{FirstName} {LastName}";
}

