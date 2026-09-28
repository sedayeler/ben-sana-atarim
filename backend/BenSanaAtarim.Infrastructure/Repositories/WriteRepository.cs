using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Common;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public class WriteRepository<T>(BenSanaAtarimDbContext context) : IWriteRepository<T> where T : BaseEntity
{
    private readonly DbSet<T> _entities = context.Set<T>();

    public async Task<T> AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await _entities.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        _entities.Update(entity);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
    {
        _entities.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);
    }
}
