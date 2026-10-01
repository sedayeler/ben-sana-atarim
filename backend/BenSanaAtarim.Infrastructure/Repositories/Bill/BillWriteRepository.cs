using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillWriteRepository : WriteRepository<Bill>, IBillWriteRepository
{
    private readonly BenSanaAtarimDbContext _context;

    public BillWriteRepository(BenSanaAtarimDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task UpdateReceiptAsync(Bill bill, decimal serviceCharge, CancellationToken cancellationToken = default)
    {
        _context.Entry(bill).Property(entity => entity.ServiceCharge).CurrentValue = serviceCharge;
        await _context.SaveChangesAsync(cancellationToken);
    }
}