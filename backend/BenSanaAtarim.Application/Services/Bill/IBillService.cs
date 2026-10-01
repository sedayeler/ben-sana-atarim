using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Application.Services.Models;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Application.Services;

public interface IBillService
{
    Task<Bill> CreateBillAsync(string hostName, CancellationToken cancellationToken = default);
    Task<BillDetails?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<Participant> JoinAsync(string code, string participantName, CancellationToken cancellationToken = default);
    Task<Bill> ConfirmReceiptAsync(Guid billId, Guid hostParticipantId, ReceiptParseResult receipt, CancellationToken cancellationToken = default);
    Task<ItemSelection> SelectItemAsync(Guid billId, Guid participantId, Guid billItemId, int quantity = 1, CancellationToken cancellationToken = default);
    Task RemoveItemSelectionAsync(Guid billId, Guid participantId, Guid billItemId, CancellationToken cancellationToken = default);
    Task<ItemSelection> ChangeItemSelectionQuantityAsync(Guid billId, Guid participantId, Guid billItemId, int quantity, CancellationToken cancellationToken = default);
    Task ChangeItemSplitTypeAsync(Guid billId, Guid hostParticipantId, Guid billItemId, SplitType splitType, CancellationToken cancellationToken = default);
    Task<Participant> SetParticipantReadyAsync(Guid billId, Guid participantId, bool isReady, CancellationToken cancellationToken = default);
}