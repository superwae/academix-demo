namespace AcademixLMS.Application.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string firstName, string verificationLink, CancellationToken cancellationToken = default);
    Task SendPasswordResetEmailAsync(string toEmail, string firstName, string resetLink, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generic send used for transactional notifications (support tickets, admin alerts).
    /// Silently skipped when the email provider isn't configured.
    /// </summary>
    Task SendAsync(string toEmail, string? toName, string subject, string htmlBody, string plainTextBody, string logLabel, CancellationToken cancellationToken = default);
}
