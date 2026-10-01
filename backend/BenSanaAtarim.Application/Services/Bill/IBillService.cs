using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Services;

public interface IBillService
{
    Task<Bill> CreateBillAsync(string hostName, CancellationToken cancellationToken = default);
    Task<Bill> ConfirmReceiptAsync(Guid billId, Guid hostParticipantId, ReceiptParseResult receipt, CancellationToken cancellationToken = default);
}
