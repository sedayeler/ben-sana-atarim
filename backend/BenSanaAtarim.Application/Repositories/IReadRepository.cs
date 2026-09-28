using BenSanaAtarim.Domain.Common;

namespace BenSanaAtarim.Application.Repositories;

public interface IReadRepository<T> : IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
}
