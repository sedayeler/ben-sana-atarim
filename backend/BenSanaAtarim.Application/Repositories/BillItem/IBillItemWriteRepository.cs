using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Application.Repositories;

public interface IBillItemWriteRepository : IWriteRepository<BillItem>
{
    Task SetSplitTypeAsync(BillItem item, SplitType splitType, CancellationToken cancellationToken = default);
}