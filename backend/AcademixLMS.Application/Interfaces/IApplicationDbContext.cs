using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Abstraction for database context to maintain Clean Architecture boundaries
/// Application layer uses this interface instead of directly depending on Infrastructure
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Course> Courses { get; }
    DbSet<CourseSection> CourseSections { get; }
    DbSet<SectionMeetingTime> SectionMeetingTimes { get; }
    DbSet<Enrollment> Enrollments { get; }
    DbSet<Assignment> Assignments { get; }
    DbSet<AssignmentSubmission> AssignmentSubmissions { get; }
    DbSet<Exam> Exams { get; }
    DbSet<ExamQuestion> ExamQuestions { get; }
    DbSet<ExamAttempt> ExamAttempts { get; }
    DbSet<Message> Messages { get; }
    DbSet<Tag> Tags { get; }
    DbSet<CourseTag> CourseTags { get; }
    DbSet<Review> Reviews { get; }
    
    // Lesson System
    DbSet<Lesson> Lessons { get; }
    DbSet<LessonSection> LessonSections { get; }
    DbSet<LessonProgress> LessonProgresses { get; }
    
    // Messaging System
    DbSet<Conversation> Conversations { get; }
    DbSet<ConversationParticipant> ConversationParticipants { get; }
    DbSet<ConversationMessage> ConversationMessages { get; }
    DbSet<ConversationRequest> ConversationRequests { get; }
    DbSet<BlockedUser> BlockedUsers { get; }
    DbSet<ReportedUser> ReportedUsers { get; }

    // User Interests & Learning Goals (AI Recommendations)
    DbSet<UserInterest> UserInterests { get; }
    DbSet<UserLearningGoal> UserLearningGoals { get; }

    DbSet<Notification> Notifications { get; }

    DbSet<CourseMaterial> CourseMaterials { get; }
    DbSet<LessonRating> LessonRatings { get; }
    DbSet<MeetingTimeRating> MeetingTimeRatings { get; }

    // Subscription & Payment System
    DbSet<SubscriptionPlan> SubscriptionPlans { get; }
    DbSet<Subscription> Subscriptions { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Discount> Discounts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    int SaveChanges();
}


