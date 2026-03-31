using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Auth;

namespace AcademixLMS.Application.Interfaces;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<Result<LoginResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<Result<RefreshTokenResponse>> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task<Result> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);
    /// <summary>Forgot password: sends reset link to email if user exists.</summary>
    Task<Result> ForgotPasswordAsync(string email, CancellationToken cancellationToken = default);
    /// <summary>Reset password using token from email link.</summary>
    Task<Result> ResetPasswordWithTokenAsync(string token, string newPassword, CancellationToken cancellationToken = default);
    /// <summary>Verify email using token from verification email.</summary>
    Task<Result> VerifyEmailAsync(string token, CancellationToken cancellationToken = default);
    /// <summary>Resend verification email to unverified user.</summary>
    Task<Result> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default);
    /// <summary>Change password for authenticated user (requires current password).</summary>
    Task<Result> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default);
}


