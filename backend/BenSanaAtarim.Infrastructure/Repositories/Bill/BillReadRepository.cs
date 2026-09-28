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
}
