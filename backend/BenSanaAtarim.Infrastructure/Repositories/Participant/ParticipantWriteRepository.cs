using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class ParticipantWriteRepository : WriteRepository<Participant>, IParticipantWriteRepository
{
    private readonly BenSanaAtarimDbContext _context;

    public ParticipantWriteRepository(BenSanaAtarimDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task SetReadyAsync(Participant participant, bool isReady, CancellationToken cancellationToken = default)
    {
        _context.Attach(participant);
        var property = _context.Entry(participant).Property(entity => entity.IsReady);
        property.CurrentValue = isReady;
        property.IsModified = true;
        await _context.SaveChangesAsync(cancellationToken);
    }
}