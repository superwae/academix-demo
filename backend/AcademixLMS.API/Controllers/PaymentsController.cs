using AcademixLMS.API.Extensions;
using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Payment;
using AcademixLMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;

namespace AcademixLMS.API.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[Tags("Payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILahzaService _lahzaService;
    private readonly IEnrollmentService _enrollmentService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentService paymentService,
        ILahzaService lahzaService,
        IEnrollmentService enrollmentService,
        IConfiguration configuration,
        ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _lahzaService = lahzaService;
        _enrollmentService = enrollmentService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Initialize course payment via Lahza
    /// </summary>
    [HttpPost("initialize/course")]
    [Authorize]
    [ProducesResponseType(typeof(InitializePaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> InitializeCoursePayment([FromBody] InitializePaymentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _paymentService.InitializeCoursePaymentAsync(userId, request.CourseId, request.DiscountCode, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Verify payment after Lahza redirect
    /// </summary>
    [HttpGet("verify/{reference}")]
    [Authorize]
    [ProducesResponseType(typeof(PaymentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyPayment(string reference, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _paymentService.VerifyPaymentAsync(reference, cancellationToken);

        if (!result.IsSuccess || result.Value == null)
        {
            if (result.Error?.Contains("not found") == true)
                return NotFound(result.Error);
            return BadRequest(result.Error);
        }

        // Auto-enroll student in the course on successful payment
        if (result.Value.Status == "Completed" && result.Value.CourseId.HasValue)
        {
            var enrollResult = await _enrollmentService.EnrollAfterPaymentAsync(userId, result.Value.CourseId.Value, result.Value.Id, cancellationToken);
            if (!enrollResult.IsSuccess)
            {
                _logger.LogWarning("Auto-enrollment failed for user {UserId} in course {CourseId} after payment {Reference}: {Error}",
                    userId, result.Value.CourseId.Value, reference, enrollResult.Error);
            }
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Lahza webhook callback
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        // Read the request body
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(cancellationToken);

        // Verify the Lahza signature
        var signature = Request.Headers["x-lahza-signature"].FirstOrDefault();
        var secretKey = _configuration["Lahza:SecretKey"] ?? "";

        if (string.IsNullOrEmpty(signature))
        {
            _logger.LogWarning("Webhook received without signature header");
            return Ok(); // Return 200 to prevent retries
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
        var computedSignature = BitConverter.ToString(computedHash).Replace("-", "").ToLowerInvariant();

        if (!string.Equals(signature, computedSignature, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Webhook signature verification failed");
            return Ok(); // Return 200 to prevent retries
        }

        // Process the webhook event
        var result = await _lahzaService.HandleWebhookAsync(body, cancellationToken);

        if (!result.IsSuccess)
        {
            _logger.LogError("Webhook processing failed: {Error}", result.Error);
        }

        return Ok();
    }

    /// <summary>
    /// Get current user's payment history
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(PagedResult<PaymentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyPayments([FromQuery] PagedRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _paymentService.GetPaymentsByUserAsync(userId, request, cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get all payments (admin)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(PagedResult<PaymentListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllPayments([FromQuery] PagedRequest pagedRequest, [FromQuery] PaymentFilterRequest? filters, CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetAllPaymentsAsync(pagedRequest, filters, cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }

    /// <summary>
    /// Get payment dashboard summary stats (admin)
    /// </summary>
    [HttpGet("summary")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(PaymentSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentSummary(CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetPaymentSummaryAsync(cancellationToken);

        if (!result.IsSuccess)
            return BadRequest(result.Error);

        return Ok(result.Value);
    }
}
