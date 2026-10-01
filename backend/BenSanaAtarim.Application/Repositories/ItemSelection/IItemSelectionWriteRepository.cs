using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Repositories;

public interface IItemSelectionWriteRepository : IWriteRepository<ItemSelection>
{
    Task SetQuantityAsync(ItemSelection selection, int quantity, CancellationToken cancellationToken = default);
}