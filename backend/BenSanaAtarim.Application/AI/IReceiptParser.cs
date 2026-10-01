using BenSanaAtarim.Application.AI.Models;

namespace BenSanaAtarim.Application.AI;

public interface IReceiptParser
{
    Task<ReceiptParseResult> ParseAsync(Stream receiptImage, string mediaType, CancellationToken cancellationToken = default);
}
