using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Common;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public class ReadRepository<T>(BenSanaAtarimDbContext context) : IReadRepository<T> where T : BaseEntity
{
    protected DbSet<T> Entities { get; } = context.Set<T>();

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await Entities.AsNoTracking().SingleOrDefaultAsync(entity => entity.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await Entities.AsNoTracking().ToListAsync(cancellationToken);
    }
}
