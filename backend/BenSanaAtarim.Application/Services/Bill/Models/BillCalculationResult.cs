namespace BenSanaAtarim.Application.Services.Models;

public sealed record BillCalculationResult(
    Guid BillId,
    decimal ItemsTotal,
    decimal ServiceCharge,
    decimal Total,
    IReadOnlyList<ParticipantCalculationResult> Participants);

public sealed record ParticipantCalculationResult(
    Guid ParticipantId,
    string Username,
    decimal ItemTotal,
    decimal ServiceChargeShare,
    decimal Total);
