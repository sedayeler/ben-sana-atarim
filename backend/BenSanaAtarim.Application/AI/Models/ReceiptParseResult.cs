namespace BenSanaAtarim.Application.AI.Models;

public sealed record ReceiptParseResult(decimal ServiceCharge, IReadOnlyList<ReceiptItemResult> Items);
