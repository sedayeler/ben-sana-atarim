using System.Security.Cryptography;
using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Application.Services;
using BenSanaAtarim.Application.Services.Models;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Infrastructure.Services;

public sealed class BillService(IBillReadRepository billReadRepository, IBillWriteRepository billWriteRepository,
    IParticipantWriteRepository participantWriteRepository, IBillItemWriteRepository billItemWriteRepository,
    IItemSelectionReadRepository itemSelectionReadRepository, IItemSelectionWriteRepository itemSelectionWriteRepository) : IBillService
{
    private const string CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 12;
    private const int MaximumCodeGenerationAttempts = 10;
    private const int MaximumHostNameLength = 50;
    private const int MaximumItemNameLength = 150;

    public async Task<Bill> CreateBillAsync(string hostName, CancellationToken cancellationToken = default)
    {
        var normalizedHostName = NormalizeParticipantName(hostName, nameof(hostName));
        var code = await GenerateUniqueCodeAsync(cancellationToken);
        var bill = new Bill(code);
        bill.Participants.Add(new Participant(normalizedHostName, isHost: true));

        return await billWriteRepository.AddAsync(bill, cancellationToken);
    }

    public async Task<BillDetails?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeCode(code);
        var bill = await billReadRepository.GetByCodeWithParticipantsAndItemsAsync(normalizedCode, cancellationToken);
        if (bill is null)
        {
            return null;
        }

        var itemIds = bill.Items.Select(item => item.Id).ToArray();
        var selections = await itemSelectionReadRepository.GetByBillItemIdsAsync(itemIds, cancellationToken);

        return new BillDetails(bill, selections);
    }

    public async Task<Participant> JoinAsync(string code, string participantName, CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeCode(code);
        var normalizedName = NormalizeParticipantName(participantName, nameof(participantName));
        var bill = await billReadRepository.GetByCodeWithParticipantsAndItemsAsync(normalizedCode, cancellationToken) ?? throw new KeyNotFoundException("Bill was not found.");

        EnsureActive(bill);

        var participant = new Participant(bill.Id, normalizedName, isHost: false);
        return await participantWriteRepository.AddAsync(participant, cancellationToken);
    }

    public async Task<Bill> ConfirmReceiptAsync(Guid billId, Guid hostParticipantId, ReceiptParseResult receipt, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(receipt);

        var bill = await GetActiveBillAsync(billId, cancellationToken);
        EnsureHost(bill, hostParticipantId);

        if (receipt.ServiceCharge < 0)
        {
            throw new ArgumentException("Service charge cannot be negative.", nameof(receipt));
        }

        var items = receipt.Items.Select(CreateBillItem).ToList();
        var itemIds = bill.Items.Select(item => item.Id).ToArray();
        var selections = await itemSelectionReadRepository.GetByBillItemIdsAsync(itemIds, cancellationToken);

        foreach (var participant in bill.Participants.Where(participant => participant.IsReady))
        {
            await participantWriteRepository.SetReadyAsync(participant, false, cancellationToken);
        }

        foreach (var selection in selections)
        {
            await itemSelectionWriteRepository.DeleteAsync(selection, cancellationToken);
        }

        bill.Items.Clear();
        foreach (var item in items)
        {
            bill.Items.Add(item);
        }

        await billWriteRepository.UpdateReceiptAsync(bill, receipt.ServiceCharge, cancellationToken);
        return bill;
    }

    public async Task<ItemSelection> SelectItemAsync(Guid billId, Guid participantId, Guid billItemId, int quantity = 1, CancellationToken cancellationToken = default)
    {
        var bill = await GetActiveBillAsync(billId, cancellationToken);
        var participant = GetParticipant(bill, participantId);
        var item = GetItem(bill, billItemId);

        var existingSelection = await itemSelectionReadRepository.GetByParticipantAndBillItemAsync(participantId, billItemId, cancellationToken);
        if (existingSelection is not null)
        {
            throw new InvalidOperationException("The participant has already selected this item.");
        }

        var selectionQuantity = 1;
        if (item.SplitType == SplitType.Quantity)
        {
            EnsurePositiveQuantity(quantity);
            var selections = await itemSelectionReadRepository.GetByBillItemIdAsync(billItemId, cancellationToken);
            EnsureAvailableQuantity(item, selections, quantity);
            selectionQuantity = quantity;
        }

        await ResetReadyAsync(participant, cancellationToken);

        var selection = new ItemSelection(billItemId, participantId, selectionQuantity);
        return await itemSelectionWriteRepository.AddAsync(selection, cancellationToken);
    }

    public async Task RemoveItemSelectionAsync(Guid billId, Guid participantId, Guid billItemId, CancellationToken cancellationToken = default)
    {
        var bill = await GetActiveBillAsync(billId, cancellationToken);
        var participant = GetParticipant(bill, participantId);
        GetItem(bill, billItemId);

        var selection = await itemSelectionReadRepository.GetByParticipantAndBillItemAsync(participantId, billItemId, cancellationToken) ?? throw new KeyNotFoundException("Item selection was not found.");

        await ResetReadyAsync(participant, cancellationToken);
        await itemSelectionWriteRepository.DeleteAsync(selection, cancellationToken);
    }

    public async Task<ItemSelection> ChangeItemSelectionQuantityAsync(Guid billId, Guid participantId, Guid billItemId, int quantity, CancellationToken cancellationToken = default)
    {
        var bill = await GetActiveBillAsync(billId, cancellationToken);
        var participant = GetParticipant(bill, participantId);
        var item = GetItem(bill, billItemId);

        if (item.SplitType != SplitType.Quantity)
        {
            throw new InvalidOperationException("Shared item selections do not have an adjustable quantity.");
        }

        EnsurePositiveQuantity(quantity);

        var selection = await itemSelectionReadRepository.GetByParticipantAndBillItemAsync(participantId, billItemId, cancellationToken) ?? throw new KeyNotFoundException("Item selection was not found.");
        if (selection.Quantity == quantity)
        {
            return selection;
        }

        var selections = await itemSelectionReadRepository.GetByBillItemIdAsync(billItemId, cancellationToken);
        EnsureAvailableQuantity(item, selections.Where(current => current.Id != selection.Id), quantity);

        await ResetReadyAsync(participant, cancellationToken);
        await itemSelectionWriteRepository.SetQuantityAsync(selection, quantity, cancellationToken);
        return selection;
    }

    public async Task ChangeItemSplitTypeAsync(Guid billId, Guid hostParticipantId, Guid billItemId, SplitType splitType, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(splitType))
        {
            throw new ArgumentOutOfRangeException(nameof(splitType));
        }

        var bill = await GetActiveBillAsync(billId, cancellationToken);
        EnsureHost(bill, hostParticipantId);
        var item = GetItem(bill, billItemId);

        if (item.SplitType == splitType)
        {
            return;
        }

        var selections = await itemSelectionReadRepository.GetByBillItemIdAsync(billItemId, cancellationToken);
        var selectedParticipantIds = selections.Select(selection => selection.ParticipantId).ToHashSet();

        foreach (var participant in bill.Participants.Where(participant => participant.IsReady && selectedParticipantIds.Contains(participant.Id)))
        {
            await participantWriteRepository.SetReadyAsync(participant, false, cancellationToken);
        }

        foreach (var selection in selections)
        {
            await itemSelectionWriteRepository.DeleteAsync(selection, cancellationToken);
        }

        await billItemWriteRepository.SetSplitTypeAsync(item, splitType, cancellationToken);
    }

    public async Task<Participant> SetParticipantReadyAsync(Guid billId, Guid participantId, bool isReady, CancellationToken cancellationToken = default)
    {
        var bill = await GetActiveBillAsync(billId, cancellationToken);
        var participant = GetParticipant(bill, participantId);

        if (participant.IsReady != isReady)
        {
            await participantWriteRepository.SetReadyAsync(participant, isReady, cancellationToken);
        }

        return participant;
    }

    private async Task<Bill> GetActiveBillAsync(Guid billId, CancellationToken cancellationToken)
    {
        var bill = await billReadRepository.GetWithParticipantsAndItemsAsync(billId, cancellationToken) ?? throw new KeyNotFoundException("Bill was not found.");

        EnsureActive(bill);
        return bill;
    }

    private static void EnsureActive(Bill bill)
    {
        if (bill.Status == BillStatus.Finalized)
        {
            throw new InvalidOperationException("A finalized bill cannot be changed.");
        }
    }

    private static Participant GetParticipant(Bill bill, Guid participantId)
    {
        return bill.Participants.SingleOrDefault(participant => participant.Id == participantId) ?? throw new KeyNotFoundException("Participant was not found in this bill.");
    }

    private static void EnsureHost(Bill bill, Guid participantId)
    {
        var participant = GetParticipant(bill, participantId);
        if (!participant.IsHost)
        {
            throw new UnauthorizedAccessException("Only the bill host can perform this operation.");
        }
    }

    private static BillItem GetItem(Bill bill, Guid billItemId)
    {
        return bill.Items.SingleOrDefault(item => item.Id == billItemId) ?? throw new KeyNotFoundException("Bill item was not found in this bill.");
    }

    private static void EnsurePositiveQuantity(int quantity)
    {
        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");
        }
    }

    private static void EnsureAvailableQuantity(BillItem item, IEnumerable<ItemSelection> existingSelections, int requestedQuantity)
    {
        var selectedQuantity = existingSelections.Sum(selection => (long)selection.Quantity);
        if (selectedQuantity + requestedQuantity > item.Quantity)
        {
            throw new InvalidOperationException("The total selected quantity cannot exceed the bill item quantity.");
        }
    }

    private async Task ResetReadyAsync(Participant participant, CancellationToken cancellationToken)
    {
        if (participant.IsReady)
        {
            await participantWriteRepository.SetReadyAsync(participant, false, cancellationToken);
        }
    }

    private static string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Bill code is required.", nameof(code));
        }

        return code.Trim().ToUpperInvariant();
    }

    private static string NormalizeParticipantName(string name, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Participant name is required.", parameterName);
        }

        var normalizedName = name.Trim();
        if (normalizedName.Length > MaximumHostNameLength)
        {
            throw new ArgumentException($"Participant name cannot exceed {MaximumHostNameLength} characters.", parameterName);
        }

        return normalizedName;
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