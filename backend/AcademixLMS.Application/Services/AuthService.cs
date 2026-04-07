using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Auth;
using AcademixLMS.Application.DTOs.User;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Application.Mapping;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IApplicationDbContext context,
        IJwtService jwtService,
        IConfiguration configuration,
        IEmailService emailService,
        ILogger<AuthService> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _configuration = configuration;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        _logger.LogInformation("[AUTH] Login attempt for email {Email}", normalizedEmail);

        // Find user by email (case-insensitive; stored emails are lowercase from seed/register)
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            _logger.LogWarning("[AUTH] Login failed - user not found for email {Email}", normalizedEmail);
            return Result<LoginResponse>.Failure("Invalid email or password.");
        }

        // Check if user is active
        if (!user.IsActive)
        {
            return Result<LoginResponse>.Failure(
                "This account is inactive, so you can’t sign in. If you think this is a mistake, contact support.");
        }

        // Verify password (BCrypt can throw on malformed hashes — treat as invalid)
        if (!VerifyPassword(request.Password, user.PasswordHash, "Login"))
        {
            _logger.LogWarning("[AUTH] Login failed - invalid password for user {UserId}", user.Id);
            return Result<LoginResponse>.Failure("Invalid email or password.");
        }

        // Get user roles (guard null Role navigation — avoids 500 if data is inconsistent)
        var roles = user.UserRoles.Where(ur => ur.Role != null).Select(ur => ur.Role!.Name).ToList();

        _logger.LogInformation("[AUTH] Login successful for user {UserId} ({Email}), roles: [{Roles}]",
            user.Id, user.Email, string.Join(", ", roles));

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Generate tokens
        var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Email, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        // Store refresh token
        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        // Map to DTO
        var userDto = MapToUserDto(user, roles);

        // Calculate token expiration
        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60");
        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var response = new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            User = userDto
        };

        return Result<LoginResponse>.Success(response);
    }

    public async Task<Result<LoginResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[AUTH] Registration attempt for email {Email}, role {Role}", request.Email, request.Role ?? "Student");

        // Check if email already exists
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);

        if (existingUser != null)
        {
            _logger.LogWarning("[AUTH] Registration failed - email already exists {Email}", request.Email);
            return Result<LoginResponse>.Failure("Email is already registered.");
        }

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Create user
        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            IsActive = true,
            IsEmailVerified = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        // Determine role: Instructor/Teacher for teachers, otherwise Student
        var roleName = "Student";
        if (!string.IsNullOrWhiteSpace(request.Role) &&
            (request.Role.Equals("Instructor", StringComparison.OrdinalIgnoreCase) ||
             request.Role.Equals("Teacher", StringComparison.OrdinalIgnoreCase)))
        {
            roleName = "Instructor";
        }

        var role = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == roleName && !r.IsDeleted, cancellationToken);

        if (role == null)
        {
            role = new Role
            {
                Name = roleName,
                Description = roleName == "Instructor" ? "Instructor/teacher role" : "Default role for registered users",
                IsSystemRole = true
            };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var userRole = new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            AssignedAt = DateTime.UtcNow
        };

        _context.UserRoles.Add(userRole);
        await _context.SaveChangesAsync(cancellationToken);

        // Email verification: generate token and send email
        var verificationToken = Guid.NewGuid().ToString("N");
        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
        await _context.SaveChangesAsync(cancellationToken);

        var frontendBase = _configuration["App:FrontendBaseUrl"] ?? "http://localhost:5173";
        var verifyLink = $"{frontendBase.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(verificationToken)}";
        await _emailService.SendVerificationEmailAsync(user.Email, user.FirstName, verifyLink, cancellationToken);

        // Generate tokens
        var roles = new List<string> { role.Name };
        var accessToken = _jwtService.GenerateAccessToken(user.Id, user.Email, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        // Store refresh token
        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        // Map to DTO
        var userDto = MapToUserDto(user, roles);

        // Calculate token expiration
        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60");
        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var response = new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            User = userDto
        };

        _logger.LogInformation("[AUTH] Registration successful for user {UserId} ({Email})", user.Id, user.Email);
        return Result<LoginResponse>.Success(response);
    }

    public async Task<Result<RefreshTokenResponse>> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        // Find refresh token
        var refreshTokenEntity = await _context.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken && !rt.IsDeleted, cancellationToken);

        if (refreshTokenEntity == null)
        {
            return Result<RefreshTokenResponse>.Failure("Invalid refresh token.");
        }

        // Check if token is revoked
        if (refreshTokenEntity.IsRevoked)
        {
            return Result<RefreshTokenResponse>.Failure("Refresh token has been revoked.");
        }

        // Check if token is expired
        if (refreshTokenEntity.ExpiresAt < DateTime.UtcNow)
        {
            return Result<RefreshTokenResponse>.Failure("Refresh token has expired.");
        }

        // Check if user is active
        if (!refreshTokenEntity.User.IsActive || refreshTokenEntity.User.IsDeleted)
        {
            return Result<RefreshTokenResponse>.Failure("User account is not active.");
        }

        // Revoke old token
        refreshTokenEntity.IsRevoked = true;
        refreshTokenEntity.RevokedAt = DateTime.UtcNow;

        // Get user roles
        var roles = refreshTokenEntity.User.UserRoles.Select(ur => ur.Role.Name).ToList();

        // Generate new tokens
        var accessToken = _jwtService.GenerateAccessToken(refreshTokenEntity.User.Id, refreshTokenEntity.User.Email, roles);
        var newRefreshToken = _jwtService.GenerateRefreshToken();

        // Store new refresh token
        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = refreshTokenEntity.User.Id,
            Token = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays)
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        // Calculate token expiration
        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60");
        var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var response = new RefreshTokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = expiresAt
        };

        return Result<RefreshTokenResponse>.Success(response);
    }

    public async Task<Result> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var refreshTokenEntity = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsDeleted && !rt.IsRevoked, cancellationToken);

        if (refreshTokenEntity != null)
        {
            refreshTokenEntity.IsRevoked = true;
            refreshTokenEntity.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }

    public async Task<Result> ForgotPasswordAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            // Don't reveal if email exists for security
            return Result.Success();
        }

        var resetToken = Guid.NewGuid().ToString("N");
        user.PasswordResetToken = resetToken;
        user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(1);
        await _context.SaveChangesAsync(cancellationToken);

        var frontendBase = _configuration["App:FrontendBaseUrl"] ?? "http://localhost:5173";
        var resetLink = $"{frontendBase.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(resetToken)}";
        await _emailService.SendPasswordResetEmailAsync(user.Email, user.FirstName, resetLink, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ResetPasswordWithTokenAsync(string token, string newPassword, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
            return Result.Failure("Invalid request.");
        if (newPassword.Length < 8)
            return Result.Failure("Password must be at least 8 characters.");

        // Normalize token so link casing (e.g. from email client) does not invalidate it
        var normalizedToken = token.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.PasswordResetToken != null && u.PasswordResetToken.ToLower() == normalizedToken && !u.IsDeleted, cancellationToken);

        if (user == null || user.PasswordResetTokenExpiresAt == null || user.PasswordResetTokenExpiresAt < DateTime.UtcNow)
            return Result.Failure("Invalid or expired reset link. Please request a new one.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiresAt = null;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> VerifyEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Result.Failure("Invalid verification link.");

        var normalizedToken = token.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.EmailVerificationToken != null && u.EmailVerificationToken.ToLower() == normalizedToken && !u.IsDeleted, cancellationToken);

        if (user == null || user.EmailVerificationTokenExpiresAt == null || user.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
            return Result.Failure("Invalid or expired verification link.");

        user.IsEmailVerified = true;
        user.EmailVerifiedAt = DateTime.UtcNow;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresAt = null;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return Result.Failure("Email is required.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email.Trim() && !u.IsDeleted, cancellationToken);

        if (user == null)
            return Result.Success(); // Don't reveal if user exists

        if (user.IsEmailVerified)
            return Result.Success(); // Already verified, no need to resend

        var verificationToken = Guid.NewGuid().ToString("N");
        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
        await _context.SaveChangesAsync(cancellationToken);

        var frontendBase = _configuration["App:FrontendBaseUrl"] ?? "http://localhost:5173";
        var verifyLink = $"{frontendBase.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(verificationToken)}";
        await _emailService.SendVerificationEmailAsync(user.Email, user.FirstName, verifyLink, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(currentPassword))
            return Result.Failure("Current password is required.");
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
            return Result.Failure("New password must be at least 8 characters.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);
        if (user == null)
            return Result.Failure("User not found.");

        if (!VerifyPassword(currentPassword, user.PasswordHash, "ChangePassword"))
            return Result.Failure("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("[AUTH] Password changed for user {UserId}", userId);
        return Result.Success();
    }

    private bool VerifyPassword(string plainPassword, string? passwordHash, string context)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            _logger.LogWarning("[AUTH] {Context} - password hash is empty", context);
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.Verify(plainPassword, passwordHash);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[AUTH] {Context} - BCrypt verify failed (invalid hash in database?)", context);
            return false;
        }
    }

    private static UserDto MapToUserDto(User user, List<string> roles)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            ProfilePictureUrl = user.ProfilePictureUrl,
            Bio = user.Bio,
            CoverImageUrl = user.CoverImageUrl,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAt = user.CreatedAt,
            Roles = roles,
            UiPreferences = UserUiPreferencesJson.Deserialize(user.UiPreferencesJson)
        };
    }
}

