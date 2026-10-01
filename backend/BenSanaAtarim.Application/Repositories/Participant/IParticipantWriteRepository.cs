using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Repositories;

public interface IParticipantWriteRepository : IWriteRepository<Participant>
{
    Task SetReadyAsync(Participant participant, bool isReady, CancellationToken cancellationToken = default);
}