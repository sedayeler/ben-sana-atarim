using System.Security.Cryptography;
using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Application.Services;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Infrastructure.Services;

public sealed class BillService(IBillReadRepository billReadRepository, IBillWriteRepository billWriteRepository) : IBillService
{
    private const string CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 12;
    private const int MaximumCodeGenerationAttempts = 10;
    private const int MaximumHostNameLength = 50;
    private const int MaximumItemNameLength = 150;

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

    public async Task<Bill> ConfirmReceiptAsync(Guid billId, Guid hostParticipantId, ReceiptParseResult receipt, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(receipt);

        var bill = await billReadRepository.GetWithParticipantsAndItemsAsync(billId, cancellationToken) ?? throw new KeyNotFoundException("Bill was not found.");

        if (bill.Status == BillStatus.Finalized)
        {
            throw new InvalidOperationException("A finalized bill cannot be changed.");
        }

        var isHost = bill.Participants.Any(participant => participant.Id == hostParticipantId && participant.IsHost);
        if (!isHost)
        {
            throw new UnauthorizedAccessException("Only the bill host can confirm a receipt.");
        }

        if (receipt.ServiceCharge < 0)
        {
            throw new ArgumentException("Service charge cannot be negative.", nameof(receipt));
        }

        var items = receipt.Items.Select(CreateBillItem).ToList();

        bill.Items.Clear();
        foreach (var item in items)
        {
            bill.Items.Add(item);
        }

        await billWriteRepository.UpdateReceiptAsync(bill, receipt.ServiceCharge, cancellationToken);
        return bill;
    }

    private static BillItem CreateBillItem(ReceiptItemResult item)
    {
        if (string.IsNullOrWhiteSpace(item.Name))
        {
            throw new ArgumentException("Bill item name is required.", nameof(item));
        }

        var normalizedName = item.Name.Trim();
        if (normalizedName.Length > MaximumItemNameLength)
        {
            throw new ArgumentException($"Bill item name cannot exceed {MaximumItemNameLength} characters.", nameof(item));
        }

        if (item.Quantity <= 0)
        {
            throw new ArgumentException("Bill item quantity must be greater than zero.", nameof(item));
        }

        if (item.UnitPrice < 0)
        {
            throw new ArgumentException("Bill item unit price cannot be negative.", nameof(item));
        }

        var splitType = item.Quantity > 1 ? SplitType.Quantity : SplitType.Shared;

        return new BillItem(normalizedName, item.Quantity, item.UnitPrice, splitType);
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
