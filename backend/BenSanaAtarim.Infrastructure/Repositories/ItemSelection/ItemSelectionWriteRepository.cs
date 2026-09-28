using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Infrastructure.Persistence;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class ItemSelectionWriteRepository(BenSanaAtarimDbContext context) : WriteRepository<ItemSelection>(context), IItemSelectionWriteRepository
{
}