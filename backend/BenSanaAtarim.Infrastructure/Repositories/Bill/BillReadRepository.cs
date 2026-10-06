using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillReadRepository(BenSanaAtarimDbContext context) : ReadRepository<Bill>(context), IBillReadRepository
{
    public async Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default)
    {
        return await Entities.AsNoTracking().AnyAsync(bill => bill.Code == code, cancellationToken);
    }

    public async Task<Guid?> GetIdByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await Entities.AsNoTracking().Where(bill => bill.Code == code).Select(bill => (Guid?)bill.Id).SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<Bill?> GetWithParticipantsAndItemsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await IncludeParticipantsAndItems().SingleOrDefaultAsync(bill => bill.Id == id, cancellationToken);
    }

    public async Task<Bill?> GetByCodeWithParticipantsAndItemsAsync(string code, CancellationToken cancellationToken = default)
    {
        return await IncludeParticipantsAndItems().SingleOrDefaultAsync(bill => bill.Code == code, cancellationToken);
    }

    private IQueryable<Bill> IncludeParticipantsAndItems()
    {
        return Entities.Include(bill => bill.Participants.OrderBy(participant => participant.Id)).Include(bill => bill.Items.OrderBy(item => item.Id));
    }
}
