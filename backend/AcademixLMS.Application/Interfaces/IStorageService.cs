namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Service for uploading and managing files (assignments, thumbnails, etc.)
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Upload a file and return the URL path for access.
    /// </summary>
    /// <param name="fileStream">The file stream to upload</param>
    /// <param name="fileName">Original file name</param>
    /// <param name="folder">Folder within storage (e.g. "assignments", "thumbnails")</param>
    /// <param name="contentType">MIME type of the file</param>
    /// <returns>URL path to access the file (e.g. /uploads/assignments/xxx.pdf)</returns>
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string folder, string contentType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a file by its storage path.
    /// </summary>
    Task DeleteFileAsync(string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the full physical path for a stored file (for serving).
    /// Returns null if file does not exist.
    /// </summary>
    string? GetFullPath(string relativePath);
}
