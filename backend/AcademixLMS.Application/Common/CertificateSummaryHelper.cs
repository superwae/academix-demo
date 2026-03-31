using System.Linq;

namespace AcademixLMS.Application.Common;

/// <summary>Limits certificate blurb length for predictable print layout.</summary>
public static class CertificateSummaryHelper
{
    public const int MaxWords = 80;

    /// <summary>Returns null for empty input; trims to <see cref="MaxWords"/> words.</summary>
    public static string? Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var words = text.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0)
            return null;
        if (words.Length <= MaxWords)
            return string.Join(' ', words);

        return string.Join(' ', words.Take(MaxWords));
    }

    public static bool ExceedsMaxWords(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return false;
        var words = text.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return words.Length > MaxWords;
    }
}
