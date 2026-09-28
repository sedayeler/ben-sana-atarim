using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Repositories;

public interface IBillReadRepository : IReadRepository<Bill>
{
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default);
}
