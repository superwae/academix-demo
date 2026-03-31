using System.Security.Claims;

namespace AcademixLMS.API.Extensions;

public static class ClaimsExtensions
{
    /// <summary>
    /// Gets the current user ID from JWT claims
    /// </summary>
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    /// <summary>
    /// Gets the current user ID from HttpContext, throws if not found
    /// </summary>
    public static Guid GetRequiredUserId(this ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        if (userId == null)
        {
            throw new UnauthorizedAccessException("User ID not found in token.");
        }
        return userId.Value;
    }

    /// <summary>
    /// Checks if user has a specific role
    /// </summary>
    public static bool HasRole(this ClaimsPrincipal user, string role)
    {
        return user.IsInRole(role);
    }
}

