using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillWriteRepository(BenSanaAtarimDbContext context) : WriteRepository<Bill>(context), IBillWriteRepository
{
}