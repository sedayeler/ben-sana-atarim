using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillReadRepository(BenSanaAtarimDbContext context) : ReadRepository<Bill>(context), IBillReadRepository
{
}