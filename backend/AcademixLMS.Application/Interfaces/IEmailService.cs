namespace AcademixLMS.Application.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string firstName, string verificationLink, CancellationToken cancellationToken = default);
    Task SendPasswordResetEmailAsync(string toEmail, string firstName, string resetLink, CancellationToken cancellationToken = default);
}
