using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AcademixLMS.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Infrastructure.Services;

public class MailjetEmailService : IEmailService
{
    private const string MailjetSendUrl = "https://api.mailjet.com/v3.1/send";
    private readonly ILogger<MailjetEmailService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string? _apiKey;
    private readonly string? _secretKey;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public MailjetEmailService(
        IConfiguration configuration,
        ILogger<MailjetEmailService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _apiKey = configuration["Mailjet:ApiKey"];
        _secretKey = configuration["Mailjet:SecretKey"];
        _fromEmail = configuration["Mailjet:FromEmail"] ?? "academix.lms.ps@gmail.com";
        _fromName = configuration["Mailjet:FromName"] ?? "AcademiX";

        if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_secretKey))
            _logger.LogWarning("Mailjet: ApiKey or SecretKey missing in config. Emails will be skipped. Add Mailjet:ApiKey and Mailjet:SecretKey in appsettings.json or environment.");
    }

    public async Task SendVerificationEmailAsync(string toEmail, string firstName, string verificationLink, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_secretKey))
        {
            _logger.LogWarning("Mailjet not configured; skipping verification email to {Email}", toEmail);
            return;
        }

        var plainText = $"Hi {firstName},\n\nPlease verify your email by clicking the link below:\n\n{verificationLink}\n\nThis link expires in 24 hours.\n\n— AcademiX";
        var htmlContent = $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: sans-serif; line-height: 1.6; color: #333;"">
  <p>Hi {firstName},</p>
  <p>Please verify your email by clicking the button below:</p>
  <p><a href=""{verificationLink}"" style=""display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px;"">Verify Email</a></p>
  <p>Or copy this link: <a href=""{verificationLink}"">{verificationLink}</a></p>
  <p style=""color: #666; font-size: 14px;"">This link expires in 24 hours.</p>
  <p>— AcademiX</p>
</body>
</html>";

        await SendMailjetEmailAsync(
            toEmail,
            firstName,
            "Verify your AcademiX account",
            plainText,
            htmlContent,
            "verification",
            cancellationToken);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string firstName, string resetLink, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_secretKey))
        {
            _logger.LogWarning("Mailjet not configured; skipping password reset email to {Email}", toEmail);
            return;
        }

        var plainText = $"Hi {firstName},\n\nYou requested a password reset. Click the link below to set a new password:\n\n{resetLink}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n— AcademiX";
        var htmlContent = $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: sans-serif; line-height: 1.6; color: #333;"">
  <p>Hi {firstName},</p>
  <p>You requested a password reset. Click the button below to set a new password:</p>
  <p><a href=""{resetLink}"" style=""display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px;"">Reset Password</a></p>
  <p>Or copy this link: <a href=""{resetLink}"">{resetLink}</a></p>
  <p style=""color: #666; font-size: 14px;"">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  <p>— AcademiX</p>
</body>
</html>";

        await SendMailjetEmailAsync(
            toEmail,
            firstName,
            "Reset your AcademiX password",
            plainText,
            htmlContent,
            "password-reset",
            cancellationToken);
    }

    private async Task SendMailjetEmailAsync(
        string toEmail,
        string toName,
        string subject,
        string textPart,
        string htmlPart,
        string logLabel,
        CancellationToken cancellationToken)
    {
        try
        {
            var payload = new
            {
                Messages = new[]
                {
                    new
                    {
                        From = new { Email = _fromEmail, Name = _fromName },
                        To = new[] { new { Email = toEmail, Name = toName } },
                        Subject = subject,
                        TextPart = textPart,
                        HTMLPart = htmlPart
                    }
                }
            };

            var json = JsonSerializer.Serialize(payload);
            var request = new HttpRequestMessage(HttpMethod.Post, MailjetSendUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_apiKey}:{_secretKey}")));
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation(
                "[EMAIL OUTBOUND] Type: {Label} | To: {To} | Subject: {Subject} | From: {From} | Starting send",
                logLabel, toEmail, subject, _fromEmail);

            var client = _httpClientFactory.CreateClient();
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var response = await client.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation(
                    "[EMAIL SENT] Type: {Label} | To: {To} | Subject: {Subject} | Duration: {Duration}ms | Response: {Body}",
                    logLabel, toEmail, subject, sw.ElapsedMilliseconds, body);
                return;
            }

            _logger.LogError(
                "[EMAIL FAILED] Type: {Label} | To: {To} | Subject: {Subject} | Status: {Status} | Duration: {Duration}ms | Response: {Body}",
                logLabel, toEmail, subject, response.StatusCode, sw.ElapsedMilliseconds, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[EMAIL EXCEPTION] Type: {Label} | To: {To} | Subject: {Subject} | Error: {Error}",
                logLabel, toEmail, subject, ex.Message);
        }
    }
}
