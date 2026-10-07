using System.Security.Authentication;
using BenSanaAtarim.Application.AI;
using BenSanaAtarim.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace BenSanaAtarim.Api;

[ApiController]
[Route("api/bills")]
public sealed class BillsController : ControllerBase
{
    private const long MaximumReceiptImageBytes = 10 * 1024 * 1024;
    private static readonly SemaphoreSlim BillPublishLock = new(1, 1);
    private readonly IBillService _billService;
    private readonly IReceiptParser _receiptParser;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<BillHub> _hub;

    public BillsController(IBillService billService, IReceiptParser receiptParser, IServiceScopeFactory scopeFactory, IHubContext<BillHub> hub)
    {
        _billService = billService;
        _receiptParser = receiptParser;
        _scopeFactory = scopeFactory;
        _hub = hub;
    }

    [HttpPost]
    [EnableRateLimiting("bill-write")]
    public async Task<IActionResult> CreateBill([FromBody] CreateBillRequest request, CancellationToken cancellationToken)
    {
        var session = await _billService.CreateBillAsync(request.Username, cancellationToken);
        var snapshot = await PublishUpdatedBillAsync(session.Bill.Id);
        return Created($"/api/bills/{snapshot.Code}", new BillSessionResponse(session.AccessToken, session.Participant.Id, session.Participant.Username, snapshot));
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> GetBill(string code, CancellationToken cancellationToken)
    {
        var details = await _billService.GetByCodeAsync(code, cancellationToken);
        return details is null ? NotFound() : Ok(details.ToResponse());
    }

    [HttpPost("{code}/participants")]
    [EnableRateLimiting("bill-write")]
    public async Task<IActionResult> JoinBill(string code, [FromBody] JoinBillRequest request, CancellationToken cancellationToken)
    {
        var session = await _billService.JoinAsync(code, request.Username, cancellationToken);
        var snapshot = await PublishUpdatedBillAsync(session.Bill.Id);
        return Ok(new BillSessionResponse(session.AccessToken, session.Participant.Id, session.Participant.Username, snapshot));
    }

    [HttpPost("{billId:guid}/receipt/parse")]
    [Consumes("multipart/form-data")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaximumReceiptImageBytes + 64 * 1024)]
    [IgnoreAntiforgeryToken]
    [EnableRateLimiting("receipt-parse")]
    public async Task<IActionResult> ParseReceipt(Guid billId, IFormFile image, CancellationToken cancellationToken)
    {
        await _billService.EnsureHostAccessAsync(billId, GetBearerToken(), cancellationToken);

        if (image is null || image.Length == 0)
        {
            throw new ArgumentException("Receipt image is required.", nameof(image));
        }

        if (image.Length > MaximumReceiptImageBytes)
        {
            throw new BadHttpRequestException("Receipt image cannot exceed 10 MB.", StatusCodes.Status413PayloadTooLarge);
        }

        await using var input = image.OpenReadStream();
        await using var content = new MemoryStream();
        var chunk = new byte[81920];
        long totalBytes = 0;
        int bytesRead;
        while ((bytesRead = await input.ReadAsync(chunk, cancellationToken)) > 0)
        {
            totalBytes += bytesRead;
            if (totalBytes > MaximumReceiptImageBytes)
            {
                throw new BadHttpRequestException("Receipt image cannot exceed 10 MB.", StatusCodes.Status413PayloadTooLarge);
            }

            await content.WriteAsync(chunk.AsMemory(0, bytesRead), cancellationToken);
        }

        var mediaType = DetectMediaType(content.GetBuffer().AsSpan(0, checked((int)content.Length)));
        if (mediaType is null)
        {
            throw new ArgumentException("Receipt image must be a valid JPEG, PNG, or WebP image.", nameof(image));
        }

        content.Position = 0;
        return Ok(await _receiptParser.ParseAsync(content, mediaType, cancellationToken));
    }

    [HttpPost("{billId:guid}/receipt/confirm")]
    public async Task<IActionResult> ConfirmReceipt(Guid billId, [FromBody] ConfirmReceiptRequest request, CancellationToken cancellationToken)
    {
        await _billService.ConfirmReceiptAsync(billId, GetBearerToken(), request.ToResult(), cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpPost("{billId:guid}/items/{billItemId:guid}/selections")]
    public async Task<IActionResult> SelectItem(Guid billId, Guid billItemId, [FromBody] SelectItemRequest request, CancellationToken cancellationToken)
    {
        await _billService.SelectItemAsync(billId, GetBearerToken(), billItemId, request.Quantity, cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpDelete("{billId:guid}/items/{billItemId:guid}/selections")]
    public async Task<IActionResult> RemoveSelection(Guid billId, Guid billItemId, CancellationToken cancellationToken)
    {
        await _billService.RemoveItemSelectionAsync(billId, GetBearerToken(), billItemId, cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpPut("{billId:guid}/items/{billItemId:guid}/selections")]
    public async Task<IActionResult> ChangeSelectionQuantity(Guid billId, Guid billItemId, [FromBody] ChangeQuantityRequest request, CancellationToken cancellationToken)
    {
        await _billService.ChangeItemSelectionQuantityAsync(billId, GetBearerToken(), billItemId, request.Quantity, cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpPut("{billId:guid}/items/{billItemId:guid}/split-type")]
    public async Task<IActionResult> ChangeSplitType(Guid billId, Guid billItemId, [FromBody] ChangeSplitTypeRequest request, CancellationToken cancellationToken)
    {
        await _billService.ChangeItemSplitTypeAsync(billId, GetBearerToken(), billItemId, request.SplitType, cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpPut("{billId:guid}/participants/ready")]
    public async Task<IActionResult> SetReady(Guid billId, [FromBody] SetReadyRequest request, CancellationToken cancellationToken)
    {
        await _billService.SetParticipantReadyAsync(billId, GetBearerToken(), request.IsReady, cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpGet("{code}/calculation")]
    public async Task<IActionResult> CalculateBill(string code, CancellationToken cancellationToken)
    {
        var details = await _billService.GetByCodeAsync(code, cancellationToken);
        return details is null ? NotFound() : Ok(await _billService.CalculateAsync(details.Bill.Id, cancellationToken));
    }

    [HttpPost("{billId:guid}/finalize")]
    public async Task<IActionResult> FinalizeBill(Guid billId, CancellationToken cancellationToken)
    {
        await _billService.FinalizeAsync(billId, GetBearerToken(), cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    [HttpPost("{billId:guid}/reopen")]
    public async Task<IActionResult> ReopenBill(Guid billId, CancellationToken cancellationToken)
    {
        await _billService.ReopenAsync(billId, GetBearerToken(), cancellationToken);
        return Ok(await PublishUpdatedBillAsync(billId));
    }

    private async Task<BillDetailsResponse> PublishUpdatedBillAsync(Guid billId)
    {
        await BillPublishLock.WaitAsync(CancellationToken.None);
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var freshBillService = scope.ServiceProvider.GetRequiredService<IBillService>();
            var details = await freshBillService.GetDetailsAsync(billId, CancellationToken.None) ?? throw new KeyNotFoundException("Bill was not found after update.");
            var snapshot = details.ToResponse();
            await _hub.Clients.Group(BillHub.GetGroupName(billId)).SendAsync("BillUpdated", snapshot, CancellationToken.None);
            return snapshot;
        }
        finally
        {
            BillPublishLock.Release();
        }
    }

    private string GetBearerToken()
    {
        var authorization = Request.Headers.Authorization.ToString();
        if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authorization[7..].Trim();
            if (token.Length == 43)
            {
                return token;
            }
        }

        throw new AuthenticationException("A participant bearer token is required.");
    }

    private static string? DetectMediaType(ReadOnlySpan<byte> data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (data.Length >= 8 && data[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return "image/png";
        }

        if (data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data.Slice(8, 4).SequenceEqual("WEBP"u8))
        {
            return "image/webp";
        }

        return null;
    }
}
