using System.Security.Claims;

namespace AcademixLMS.Application.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(Guid userId, string email, List<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}

