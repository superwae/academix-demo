using AcademixLMS.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AcademixLMS.Infrastructure.Services;

public class LocalStorageService : IStorageService
{
    private readonly string _uploadsRoot;

    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB for assignments
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
        ".xls", ".xlsx", ".ppt", ".pptx",
        ".zip", ".rar", ".7z",
        ".png", ".jpg", ".jpeg", ".gif"
    };

    public LocalStorageService(IConfiguration configuration)
    {
        var uploadsPath = configuration["Storage:UploadsPath"] ?? "uploads";
        var contentRoot = configuration["ContentRoot"] ?? AppContext.BaseDirectory ?? Directory.GetCurrentDirectory();
        _uploadsRoot = Path.Combine(contentRoot, uploadsPath);
        Directory.CreateDirectory(_uploadsRoot);
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string folder, string contentType, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            throw new ArgumentException($"File type not allowed. Allowed: {string.Join(", ", AllowedExtensions)}");

        var safeFileName = $"{Guid.NewGuid():N}{ext}";
        var folderPath = Path.Combine(_uploadsRoot, folder);
        Directory.CreateDirectory(folderPath);
        var fullPath = Path.Combine(folderPath, safeFileName);

        await using (var dest = File.Create(fullPath))
        {
            await fileStream.CopyToAsync(dest, cancellationToken);
        }

        var fileInfo = new FileInfo(fullPath);
        if (fileInfo.Length > MaxFileSizeBytes)
        {
            File.Delete(fullPath);
            throw new InvalidOperationException($"File size exceeds maximum allowed ({MaxFileSizeBytes / (1024 * 1024)} MB).");
        }

        return $"{folder}/{safeFileName}";
    }

    public Task DeleteFileAsync(string filePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(filePath) || filePath.Contains(".."))
            throw new ArgumentException("Invalid file path.");

        var fullPath = Path.Combine(_uploadsRoot, filePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }

    public string GetFullPath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || relativePath.Contains(".."))
            return null!;
        return Path.Combine(_uploadsRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
    }
}
