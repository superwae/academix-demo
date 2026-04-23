using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;

namespace AcademixLMS.API.Localization;

/// <summary>
/// Resolves the request culture from the authenticated user's stored
/// <c>PreferredLanguage</c> column. Returns <c>null</c> (falls through to the
/// next provider) whenever anything is missing — authentication, DbContext
/// scope, the user row, or the language column. Never throws.
/// </summary>
public static class UserPreferredLanguageCultureProvider
{
    public static async Task<ProviderCultureResult?> ResolveAsync(HttpContext httpContext)
    {
        try
        {
            if (httpContext?.User?.Identity?.IsAuthenticated != true) return null;

            var userId = httpContext.User.GetUserId();
            if (userId is null) return null;

            var db = httpContext.RequestServices.GetService<IApplicationDbContext>();
            if (db is null) return null;

            var language = await db.Users
                .Where(u => u.Id == userId.Value && !u.IsDeleted)
                .Select(u => u.PreferredLanguage)
                .FirstOrDefaultAsync(httpContext.RequestAborted);

            if (string.IsNullOrWhiteSpace(language)) return null;

            return new ProviderCultureResult(language);
        }
        catch
        {
            // Fail fast — never throw in the localization pipeline.
            return null;
        }
    }
}
