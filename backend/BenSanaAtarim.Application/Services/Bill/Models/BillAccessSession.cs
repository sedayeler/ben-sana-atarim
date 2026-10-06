using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Services.Models;

public sealed record BillAccessSession(Bill Bill, Participant Participant, string AccessToken);
