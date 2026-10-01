using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Repositories;

public interface IItemSelectionReadRepository : IReadRepository<ItemSelection>
{
    Task<IReadOnlyList<ItemSelection>> GetByBillItemIdsAsync(IReadOnlyCollection<Guid> billItemIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ItemSelection>> GetByBillItemIdAsync(Guid billItemId, CancellationToken cancellationToken = default);
    Task<ItemSelection?> GetByParticipantAndBillItemAsync(Guid participantId, Guid billItemId, CancellationToken cancellationToken = default);
}