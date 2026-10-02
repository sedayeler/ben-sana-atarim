using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Repositories;

public interface IParticipantReadRepository : IReadRepository<Participant>
{
    Task<bool> UsernameExistsAsync(Guid billId, string username, CancellationToken cancellationToken = default);
}
