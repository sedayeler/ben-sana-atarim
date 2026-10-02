using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class ParticipantReadRepository : ReadRepository<Participant>, IParticipantReadRepository
{
    private readonly BenSanaAtarimDbContext _context;

    public ParticipantReadRepository(BenSanaAtarimDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task<bool> UsernameExistsAsync(Guid billId, string username, CancellationToken cancellationToken = default)
    {
        return await _context.participants.AnyAsync(participant => participant.BillId == billId && participant.Username.ToLower() == username.ToLower(), cancellationToken);
    }
}
