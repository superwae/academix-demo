using System.Globalization;

namespace AcademixLMS.Application.Common;

/// <summary>Validates live-session join URLs against known video meeting platforms.</summary>
public static class TrustedMeetingUrlValidator
{
    private static readonly string[] TrustedHostSuffixes =
    [
        "meet.google.com",
        "zoom.us",
        "zoom.com",
        "zoomgov.com",
        "teams.microsoft.com",
        "teams.live.com",
        "teams.cloud.microsoft",
        "govteams.microsoft.us",
        "webex.com",
        "gotomeeting.com",
        "gotomeet.me",
        "whereby.com",
        "meet.jit.si",
        "app.chime.aws",
        "chime.aws",
        "bluejeans.com",
        "ringcentral.com",
        "join.skype.com",
        "discord.com",
        "discord.gg",
    ];

    /// <summary>
    /// Returns null when valid (including empty/null to clear a link).
    /// Otherwise returns a user-facing error message.
    /// </summary>
    public static string? Validate(string? joinUrl)
    {
        if (string.IsNullOrWhiteSpace(joinUrl))
            return null;

        var trimmed = joinUrl.Trim();
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return "Meeting link must be a valid HTTPS URL.";
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return "Meeting link must use HTTPS.";
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            return "Meeting link cannot include embedded credentials.";
        }

        var host = uri.Host.ToLowerInvariant();
        if (IsIpAddressHost(host) || !IsTrustedMeetingHost(host))
        {
            return "Meeting link must be from a supported platform (Google Meet, Zoom, Microsoft Teams, Webex, etc.).";
        }

        return null;
    }

    private static bool IsTrustedMeetingHost(string host)
    {
        var normalized = host.TrimEnd('.');
        if (string.IsNullOrEmpty(normalized))
            return false;

        foreach (var suffix in TrustedHostSuffixes)
        {
            if (normalized.Equals(suffix, StringComparison.OrdinalIgnoreCase))
                return true;
            if (normalized.EndsWith("." + suffix, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private static bool IsIpAddressHost(string host)
    {
        if (host.StartsWith('['))
            return true;

        return host.Split('.').All(part =>
            part.Length > 0 &&
            part.All(ch => char.IsAsciiDigit(ch)) &&
            int.TryParse(part, NumberStyles.None, CultureInfo.InvariantCulture, out var octet) &&
            octet is >= 0 and <= 255);
    }
}
