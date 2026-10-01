using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class ItemSelectionWriteRepository : WriteRepository<ItemSelection>, IItemSelectionWriteRepository
{
    private readonly BenSanaAtarimDbContext _context;

    public ItemSelectionWriteRepository(BenSanaAtarimDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task SetQuantityAsync(ItemSelection selection, int quantity, CancellationToken cancellationToken = default)
    {
        _context.Attach(selection);
        var property = _context.Entry(selection).Property(entity => entity.Quantity);
        property.CurrentValue = quantity;
        property.IsModified = true;
        await _context.SaveChangesAsync(cancellationToken);
    }
}