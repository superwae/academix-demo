using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Authorize]
[Tags("Files")]
public class FilesController : ControllerBase
{
    private readonly IStorageService _storage;
    private readonly ILogger<FilesController> _logger;

    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain", "text/rtf", "application/vnd.oasis.opendocument.text",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
        "image/png", "image/jpeg", "image/gif"
    };

    public FilesController(IStorageService storage, ILogger<FilesController> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file (e.g. for assignment submission). Max 25 MB.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileSizeBytes)]
    [ProducesResponseType(typeof(FileUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromQuery] string folder = "assignments", CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { error = $"File size exceeds maximum allowed ({MaxFileSizeBytes / (1024 * 1024)} MB)." });

        var contentType = file.ContentType;
        if (string.IsNullOrEmpty(contentType) || !AllowedContentTypes.Contains(contentType))
            return BadRequest(new { error = "File type not allowed." });

        try
        {
            await using var stream = file.OpenReadStream();
            var relativePath = await _storage.UploadFileAsync(stream, file.FileName, folder, contentType, cancellationToken);
            var fileUrl = $"/api/v1/files/{relativePath.Replace("\\", "/")}";
            _logger.LogInformation("File uploaded: {Path} by user {UserId}", relativePath, User.GetRequiredUserId());
            return Ok(new FileUploadResponse
            {
                FileUrl = fileUrl,
                FileName = file.FileName,
                FileSize = file.Length
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Download/serve an uploaded file.
    /// </summary>
    [HttpGet("{folder}/{fileName}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetFile(string folder, string fileName)
    {
        var relativePath = $"{folder}/{fileName}";
        var fullPath = _storage.GetFullPath(relativePath);
        if (string.IsNullOrEmpty(fullPath) || !System.IO.File.Exists(fullPath))
            return NotFound();

        var contentType = GetContentType(fileName);
        return PhysicalFile(fullPath, contentType, fileName);
    }

    private static string GetContentType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt" => "text/plain",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };
    }
}

public class FileUploadResponse
{
    public string FileUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
}
