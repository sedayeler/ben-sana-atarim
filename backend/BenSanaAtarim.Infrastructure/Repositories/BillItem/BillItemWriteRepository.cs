using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillItemWriteRepository(BenSanaAtarimDbContext context) : WriteRepository<BillItem>(context), IBillItemWriteRepository
{
}