namespace AcademixLMS.Application.DTOs.User;

/// <summary>Client theme settings persisted per user (camelCase in JSON).</summary>
public class UserUiPreferencesDto
{
    public string Theme { get; set; } = "light";
    public string? ColorMode { get; set; }
    public string? CustomThemeColor { get; set; }
    public string? MixTheme { get; set; }
    public bool? NotificationsEnabled { get; set; }
}
