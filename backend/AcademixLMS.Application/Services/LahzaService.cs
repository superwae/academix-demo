using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class LahzaService : ILahzaService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LahzaService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public LahzaService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LahzaService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        var baseUrl = _configuration["Lahza:BaseUrl"] ?? "https://api.lahza.io";
        _httpClient.BaseAddress = new Uri(baseUrl);

        var secretKey = _configuration["Lahza:SecretKey"];
        if (!string.IsNullOrWhiteSpace(secretKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", secretKey);
        }
    }

    public async Task<Result<LahzaInitializeResponse>> InitializeTransactionAsync(LahzaInitializeRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            // Build callback URL
            var callbackBaseUrl = _configuration["Lahza:CallbackBaseUrl"] ?? "";
            if (!string.IsNullOrWhiteSpace(callbackBaseUrl) && string.IsNullOrWhiteSpace(request.CallbackUrl))
            {
                request.CallbackUrl = $"{callbackBaseUrl.TrimEnd('/')}/api/payments/verify";
            }

            // Use configured currency if not set
            if (string.IsNullOrWhiteSpace(request.Currency))
            {
                request.Currency = _configuration["Lahza:Currency"] ?? "ILS";
            }

            var body = new
            {
                email = request.Email,
                mobile = request.Mobile,
                amount = request.Amount,
                currency = request.Currency,
                callback_url = request.CallbackUrl,
                reference = request.Reference,
                metadata = request.Metadata
            };

            var response = await _httpClient.PostAsJsonAsync("/transaction/initialize", body, JsonOptions, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Lahza initialize failed with status {StatusCode}: {Body}", response.StatusCode, errorBody);
                return Result<LahzaInitializeResponse>.Failure($"Lahza API returned {response.StatusCode}.");
            }

            var result = await response.Content.ReadFromJsonAsync<LahzaApiResponse<LahzaInitializeData>>(JsonOptions, cancellationToken);

            if (result == null || !result.Status)
            {
                return Result<LahzaInitializeResponse>.Failure(result?.Message ?? "Unknown Lahza error.");
            }

            return Result<LahzaInitializeResponse>.Success(new LahzaInitializeResponse
            {
                AuthorizationUrl = result.Data?.AuthorizationUrl ?? string.Empty,
                AccessCode = result.Data?.AccessCode ?? string.Empty,
                Reference = result.Data?.Reference ?? request.Reference
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing Lahza transaction for reference '{Reference}'.", request.Reference);
            return Result<LahzaInitializeResponse>.Failure("An error occurred while communicating with the payment gateway.");
        }
    }

    public async Task<Result<LahzaVerifyResponse>> VerifyTransactionAsync(string reference, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/transaction/verify/{reference}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Lahza verify failed with status {StatusCode}: {Body}", response.StatusCode, errorBody);
                return Result<LahzaVerifyResponse>.Failure($"Lahza API returned {response.StatusCode}.");
            }

            var result = await response.Content.ReadFromJsonAsync<LahzaApiResponse<LahzaVerifyData>>(JsonOptions, cancellationToken);

            if (result == null || !result.Status)
            {
                return Result<LahzaVerifyResponse>.Failure(result?.Message ?? "Unknown Lahza error.");
            }

            return Result<LahzaVerifyResponse>.Success(new LahzaVerifyResponse
            {
                Status = result.Data?.Status ?? string.Empty,
                Reference = result.Data?.Reference ?? reference,
                Amount = result.Data?.Amount ?? 0,
                Currency = result.Data?.Currency ?? string.Empty,
                Channel = result.Data?.Channel,
                AuthorizationCode = result.Data?.Authorization?.AuthorizationCode,
                PaidAt = result.Data?.PaidAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Lahza transaction for reference '{Reference}'.", reference);
            return Result<LahzaVerifyResponse>.Failure("An error occurred while verifying the payment.");
        }
    }

    public async Task<Result> HandleWebhookAsync(string payload, CancellationToken cancellationToken = default)
    {
        try
        {
            var webhookEvent = JsonSerializer.Deserialize<LahzaApiResponse<LahzaVerifyData>>(payload, JsonOptions);

            if (webhookEvent?.Data == null)
            {
                _logger.LogWarning("Received invalid Lahza webhook payload.");
                return Result.Failure("Invalid webhook payload.");
            }

            var reference = webhookEvent.Data.Reference;
            if (string.IsNullOrWhiteSpace(reference))
            {
                return Result.Failure("Webhook payload missing transaction reference.");
            }

            _logger.LogInformation("Processing Lahza webhook for reference '{Reference}', status '{Status}'.", reference, webhookEvent.Data.Status);

            // The actual payment/subscription processing is handled by PaymentService/SubscriptionService
            // This method just validates and logs the webhook
            return Result.Success();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize Lahza webhook payload.");
            return Result.Failure("Failed to parse webhook payload.");
        }
    }

    // Internal DTOs for Lahza API deserialization
    private class LahzaApiResponse<T>
    {
        [JsonPropertyName("status")]
        public bool Status { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("data")]
        public T? Data { get; set; }
    }

    private class LahzaInitializeData
    {
        [JsonPropertyName("authorization_url")]
        public string? AuthorizationUrl { get; set; }

        [JsonPropertyName("access_code")]
        public string? AccessCode { get; set; }

        [JsonPropertyName("reference")]
        public string? Reference { get; set; }
    }

    private class LahzaVerifyData
    {
        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("reference")]
        public string? Reference { get; set; }

        [JsonPropertyName("amount")]
        public long Amount { get; set; }

        [JsonPropertyName("currency")]
        public string? Currency { get; set; }

        [JsonPropertyName("channel")]
        public string? Channel { get; set; }

        [JsonPropertyName("paid_at")]
        public DateTime? PaidAt { get; set; }

        [JsonPropertyName("authorization")]
        public LahzaAuthorizationData? Authorization { get; set; }
    }

    private class LahzaAuthorizationData
    {
        [JsonPropertyName("authorization_code")]
        public string? AuthorizationCode { get; set; }
    }
}
