using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Services.Models;

public sealed record BillDetails(Bill Bill, IReadOnlyList<ItemSelection> Selections);