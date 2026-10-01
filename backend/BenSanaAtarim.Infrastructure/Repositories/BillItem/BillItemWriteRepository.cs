using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillItemWriteRepository : WriteRepository<BillItem>, IBillItemWriteRepository
{
    private readonly BenSanaAtarimDbContext _context;

    public BillItemWriteRepository(BenSanaAtarimDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task SetSplitTypeAsync(BillItem item, SplitType splitType, CancellationToken cancellationToken = default)
    {
        _context.Attach(item);
        var property = _context.Entry(item).Property(entity => entity.SplitType);
        property.CurrentValue = splitType;
        property.IsModified = true;
        await _context.SaveChangesAsync(cancellationToken);
    }
}