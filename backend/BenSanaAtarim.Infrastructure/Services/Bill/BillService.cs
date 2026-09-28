using System.Security.Cryptography;
using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Application.Services;
using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Infrastructure.Services;

public sealed class BillService(IBillReadRepository billReadRepository, IBillWriteRepository billWriteRepository) : IBillService
{
    private const string CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 12;
    private const int MaximumCodeGenerationAttempts = 10;
    private const int MaximumHostNameLength = 50;

    public async Task<Bill> CreateBillAsync(string hostName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(hostName))
        {
            throw new ArgumentException("Host name is required.", nameof(hostName));
        }

        var normalizedHostName = hostName.Trim();
        if (normalizedHostName.Length > MaximumHostNameLength)
        {
            throw new ArgumentException($"Host name cannot exceed {MaximumHostNameLength} characters.", nameof(hostName));
        }

        var code = await GenerateUniqueCodeAsync(cancellationToken);
        var bill = new Bill(code);
        bill.Participants.Add(new Participant(normalizedHostName, isHost: true));

        return await billWriteRepository.AddAsync(bill, cancellationToken);
    }

    private async Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaximumCodeGenerationAttempts; attempt++)
        {
            var code = RandomNumberGenerator.GetString(CodeCharacters, CodeLength);
            if (!await billReadRepository.CodeExistsAsync(code, cancellationToken))
            {
                return code;
            }
        }

        throw new InvalidOperationException("A unique bill code could not be generated.");
    }
}
