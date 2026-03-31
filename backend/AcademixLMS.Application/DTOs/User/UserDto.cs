using System.ComponentModel.DataAnnotations;

namespace AcademixLMS.Application.DTOs.User;

/// <summary>
/// User data transfer object for API responses
/// </summary>
public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; } = new();

    public UserUiPreferencesDto? UiPreferences { get; set; }
}

/// <summary>
/// Request DTO for creating a new user (Admin only)
/// </summary>
public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MinLength(2)]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MinLength(2)]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public List<Guid> RoleIds { get; set; } = new();
}

/// <summary>
/// Request DTO for updating user profile
/// </summary>
public class UpdateUserRequest
{
    [MinLength(2)]
    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MinLength(2)]
    [MaxLength(100)]
    public string? LastName { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(500)]
    public string? ProfilePictureUrl { get; set; }

    public bool? IsActive { get; set; }
}

/// <summary>
/// Request DTO for assigning roles to a user
/// </summary>
public class AssignRolesRequest
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one role must be specified")]
    public List<Guid> RoleIds { get; set; } = new();
}

/// <summary>
/// Request DTO for changing password (current user)
/// </summary>
public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    public string NewPassword { get; set; } = string.Empty;
}


