using AcademixLMS.Application.Common;

namespace AcademixLMS.Application.Interfaces;

/// <summary>
/// Abstracts calls to the Lahza payment gateway API.
/// </summary>
public interface ILahzaService
{
    Task<Result<LahzaInitializeResponse>> InitializeTransactionAsync(LahzaInitializeRequest request, CancellationToken cancellationToken = default);
    Task<Result<LahzaVerifyResponse>> VerifyTransactionAsync(string reference, CancellationToken cancellationToken = default);
    Task<Result> HandleWebhookAsync(string payload, CancellationToken cancellationToken = default);
}

/// <summary>
/// Request body for POST /transaction/initialize.
/// </summary>
public class LahzaInitializeRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Mobile { get; set; }
    public long Amount { get; set; }
    public string Currency { get; set; } = "ILS";
    public string CallbackUrl { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public Dictionary<string, string>? Metadata { get; set; }
}

/// <summary>
/// Response from POST /transaction/initialize.
/// </summary>
public class LahzaInitializeResponse
{
    public string AuthorizationUrl { get; set; } = string.Empty;
    public string AccessCode { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
}

/// <summary>
/// Response from GET /transaction/verify/{reference}.
/// </summary>
public class LahzaVerifyResponse
{
    public string Status { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? Channel { get; set; }
    public string? AuthorizationCode { get; set; }
    public DateTime? PaidAt { get; set; }
}
