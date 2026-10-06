using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Application.Services.Models;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Application.Services;

public interface IBillService
{
    Task<BillAccessSession> CreateBillAsync(string hostUsername, CancellationToken cancellationToken = default);
    Task<BillDetails?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<BillDetails?> GetDetailsAsync(Guid billId, CancellationToken cancellationToken = default);
    Task<BillDetails?> GetByCodeForParticipantAsync(string code, string accessToken, CancellationToken cancellationToken = default);
    Task<BillCalculationResult> CalculateAsync(Guid billId, CancellationToken cancellationToken = default);
    Task<BillAccessSession> JoinAsync(string code, string username, CancellationToken cancellationToken = default);
    Task EnsureHostAccessAsync(Guid billId, string accessToken, CancellationToken cancellationToken = default);
    Task<Bill> ConfirmReceiptAsync(Guid billId, string accessToken, ReceiptParseResult receipt, CancellationToken cancellationToken = default);
    Task<ItemSelection> SelectItemAsync(Guid billId, string accessToken, Guid billItemId, int quantity = 1, CancellationToken cancellationToken = default);
    Task RemoveItemSelectionAsync(Guid billId, string accessToken, Guid billItemId, CancellationToken cancellationToken = default);
    Task<ItemSelection> ChangeItemSelectionQuantityAsync(Guid billId, string accessToken, Guid billItemId, int quantity, CancellationToken cancellationToken = default);
    Task ChangeItemSplitTypeAsync(Guid billId, string accessToken, Guid billItemId, SplitType splitType, CancellationToken cancellationToken = default);
    Task<Participant> SetParticipantReadyAsync(Guid billId, string accessToken, bool isReady, CancellationToken cancellationToken = default);
    Task FinalizeAsync(Guid billId, string accessToken, CancellationToken cancellationToken = default);
    Task ReopenAsync(Guid billId, string accessToken, CancellationToken cancellationToken = default);
}
