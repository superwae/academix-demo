using System.Text.Json;
using AcademixLMS.Application.DTOs.User;

namespace AcademixLMS.Application.Mapping;

public static class UserUiPreferencesJson
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public static UserUiPreferencesDto? Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<UserUiPreferencesDto>(json, Options);
        }
        catch
        {
            return null;
        }
    }

    public static string Serialize(UserUiPreferencesDto dto) =>
        JsonSerializer.Serialize(dto, Options);
}
