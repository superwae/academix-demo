using System.Globalization;
using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.User;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("2. Users & Roles")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;
    private readonly IApplicationDbContext _dbContext;
    private readonly ILogger<UsersController> _logger;

    // Supported locale codes for the PUT /users/me/language endpoint.
    // Must stay in sync with Program.cs RequestLocalization configuration.
    private static readonly HashSet<string> SupportedLanguages =
        new(StringComparer.OrdinalIgnoreCase) { "en", "ar" };

    public UsersController(
        IUserService userService,
        IAuthService authService,
        IApplicationDbContext dbContext,
        ILogger<UsersController> logger)
    {
        _userService = userService;
        _authService = authService;
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(PagedResult<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var result = await _userService.GetPagedAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>Current user profile (includes saved UI theme preferences).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _userService.GetByIdAsync(userId, cancellationToken);

        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Update the current user's preferred UI language. Affects server-side i18n
    /// (error messages) immediately and persists across sessions.
    /// </summary>
    [HttpPut("me/language")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateMyLanguage([FromBody] UpdateLanguageRequest request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Language) ||
            !SupportedLanguages.Contains(request.Language))
        {
            return BadRequest(new { error = "Unsupported language." });
        }

        var userId = User.GetRequiredUserId();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);
        if (user is null) return NotFound();

        var normalized = request.Language.ToLowerInvariant();
        user.PreferredLanguage = normalized;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = userId;
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Apply the new culture to the current thread so any localized messages
        // produced by the rest of this request honor the user's new preference.
        // Subsequent requests will pick it up via the custom culture provider.
        try
        {
            var culture = new CultureInfo(normalized);
            CultureInfo.CurrentCulture = culture;
            CultureInfo.CurrentUICulture = culture;
        }
        catch (CultureNotFoundException)
        {
            // Should not happen for supported languages — guard anyway.
        }

        return NoContent();
    }

    /// <summary>Save theme / UI preferences for the current user (syncs across devices).</summary>
    [HttpPut("me/ui-preferences")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateMyUiPreferences([FromBody] UserUiPreferencesDto request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _userService.UpdateMyUiPreferencesAsync(userId, request, cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUser(Guid id, CancellationToken cancellationToken)
    {
        var result = await _userService.GetByIdAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    [HttpPost]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await _userService.CreateAsync(request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return CreatedAtAction(nameof(GetUser), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await _userService.UpdateAsync(id, request, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken cancellationToken)
    {
        var result = await _userService.DeleteAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return NotFound(result.Error);

        return NoContent();
    }

    [HttpPost("{id}/activate")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActivateUser(Guid id, CancellationToken cancellationToken)
    {
        var result = await _userService.ActivateAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    [HttpPost("{id}/suspend")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SuspendUser(Guid id, CancellationToken cancellationToken)
    {
        var result = await _userService.SuspendAsync(id, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    [HttpPost("{id}/roles")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AssignRoles(Guid id, [FromBody] AssignRolesRequest request, CancellationToken cancellationToken)
    {
        var result = await _userService.AssignRolesAsync(id, request, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    [HttpDelete("{id}/roles/{roleId}")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RevokeRole(Guid id, Guid roleId, CancellationToken cancellationToken)
    {
        var result = await _userService.RevokeRoleAsync(id, roleId, cancellationToken);
        
        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }

    /// <summary>
    /// Super-admin-only: set a per-teacher platform-fee override. Null clears the override.
    /// </summary>
    [HttpPut("{id:guid}/platform-fee")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> SetPlatformFee(Guid id, [FromBody] UpdatePlatformFeeRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (user is null) return NotFound();

        if (request.PlatformFeePercentOverride is { } pct && (pct < 0 || pct > 100))
            return BadRequest("Platform fee must be between 0 and 100.");

        user.PlatformFeePercentOverride = request.PlatformFeePercentOverride;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = User.GetUserId();
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { user.Id, user.PlatformFeePercentOverride });
    }

    /// <summary>
    /// Change password for the current authenticated user.
    /// </summary>
    [HttpPut("change-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword, cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok();
    }
}

/// <summary>Payload for PUT /users/me/language.</summary>
public record UpdateLanguageRequest(string Language);

/// <summary>Payload for admin platform-fee override on a teacher.</summary>
public record UpdatePlatformFeeRequest(decimal? PlatformFeePercentOverride);


