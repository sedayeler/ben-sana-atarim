using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Repositories;

public interface IBillWriteRepository : IWriteRepository<Bill>
{
    Task UpdateReceiptAsync(Bill bill, decimal serviceCharge, CancellationToken cancellationToken = default);
}