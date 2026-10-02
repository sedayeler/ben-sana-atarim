using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Application.Repositories;

public interface IBillWriteRepository : IWriteRepository<Bill>
{
    Task UpdateReceiptAsync(Bill bill, decimal serviceCharge, CancellationToken cancellationToken = default);
    Task UpdateStatusAndParticipantsReadyAsync(Bill bill, BillStatus status, bool participantsReady, CancellationToken cancellationToken = default);
    Task<T> ExecuteWithBillLockAsync<T>(Guid billId, Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken = default);
    Task ExecuteWithBillLockAsync(Guid billId, Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default);
}
