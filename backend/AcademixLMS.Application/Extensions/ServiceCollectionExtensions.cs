using AcademixLMS.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AcademixLMS.Application.Extensions;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Register Application layer services
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Register Application services
        services.AddScoped<IAuthService, Services.AuthService>();
        services.AddScoped<IUserService, Services.UserService>();
        services.AddScoped<ICourseService, Services.CourseService>();
        services.AddScoped<IEnrollmentService, Services.EnrollmentService>();
        services.AddScoped<IReviewService, Services.ReviewService>();
        services.AddScoped<IAssignmentService, Services.AssignmentService>();
        services.AddScoped<IExamService, Services.ExamService>();
        services.AddScoped<IConversationService, Services.ConversationService>();
        services.AddScoped<IProgressService, Services.ProgressService>();
        services.AddScoped<ILessonService, Services.LessonService>();
        services.AddScoped<ICourseMaterialService, Services.CourseMaterialService>();
        services.AddScoped<ILessonRatingService, Services.LessonRatingService>();
        services.AddScoped<IMeetingTimeRatingService, Services.MeetingTimeRatingService>();
        services.AddScoped<ICertificateService, Services.CertificateService>();

        // Subscription & Payment Services
        services.AddScoped<ISubscriptionPlanService, Services.SubscriptionPlanService>();
        services.AddScoped<ISubscriptionService, Services.SubscriptionService>();
        services.AddScoped<IPaymentService, Services.PaymentService>();
        services.AddScoped<IDiscountService, Services.DiscountService>();
        services.AddScoped<ILahzaService, Services.LahzaService>();

        // AI Services
        services.AddScoped<IRecommendationService, Services.RecommendationService>();
        services.AddScoped<IAnalyticsService, Services.AnalyticsService>();
        services.AddScoped<IOnboardingService, Services.OnboardingService>();
        services.AddSingleton<INotificationRealtimePublisher, Services.NullNotificationRealtimePublisher>();
        services.AddScoped<INotificationService, Services.NotificationService>();

        return services;
    }
}

