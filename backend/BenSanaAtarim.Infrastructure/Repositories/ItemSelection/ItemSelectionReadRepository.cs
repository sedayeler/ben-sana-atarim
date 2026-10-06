using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class ItemSelectionReadRepository(BenSanaAtarimDbContext context) : ReadRepository<ItemSelection>(context), IItemSelectionReadRepository
{
    public async Task<IReadOnlyList<ItemSelection>> GetByBillItemIdsAsync(IReadOnlyCollection<Guid> billItemIds, CancellationToken cancellationToken = default)
    {
        if (billItemIds.Count == 0)
        {
            return [];
        }

        return await Entities.AsNoTracking().Where(selection => billItemIds.Contains(selection.BillItemId)).OrderBy(selection => selection.Id).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ItemSelection>> GetByBillItemIdAsync(Guid billItemId, CancellationToken cancellationToken = default)
    {
        return await Entities.AsNoTracking().Where(selection => selection.BillItemId == billItemId).OrderBy(selection => selection.Id).ToListAsync(cancellationToken);
    }

    public async Task<ItemSelection?> GetByParticipantAndBillItemAsync(Guid participantId, Guid billItemId, CancellationToken cancellationToken = default)
    {
        return await Entities.AsNoTracking().SingleOrDefaultAsync(selection => selection.ParticipantId == participantId && selection.BillItemId == billItemId, cancellationToken);
    }
}