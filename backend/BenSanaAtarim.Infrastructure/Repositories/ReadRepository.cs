using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Common;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public class ReadRepository<T>(BenSanaAtarimDbContext context) : IReadRepository<T> where T : BaseEntity
{
    private readonly DbSet<T> _entities = context.Set<T>();

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _entities.AsNoTracking().SingleOrDefaultAsync(entity => entity.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _entities.AsNoTracking().ToListAsync(cancellationToken);
    }
}
