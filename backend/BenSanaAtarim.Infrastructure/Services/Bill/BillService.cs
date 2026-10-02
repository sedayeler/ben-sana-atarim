using System.Security.Cryptography;
using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Application.Services;
using BenSanaAtarim.Application.Services.Models;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Infrastructure.Services;

public sealed class BillService(IBillReadRepository billReadRepository, IBillWriteRepository billWriteRepository,
    IParticipantReadRepository participantReadRepository, IParticipantWriteRepository participantWriteRepository, IBillItemWriteRepository billItemWriteRepository,
    IItemSelectionReadRepository itemSelectionReadRepository, IItemSelectionWriteRepository itemSelectionWriteRepository) : IBillService
{
    private const string CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 12;
    private const int MaximumCodeGenerationAttempts = 10;
    private const int MaximumUsernameLength = 50;
    private const int MaximumItemNameLength = 150;

    public async Task<Bill> CreateBillAsync(string hostUsername, CancellationToken cancellationToken = default)
    {
        var normalizedHostUsername = NormalizeParticipantUsername(hostUsername, nameof(hostUsername));
        var code = await GenerateUniqueCodeAsync(cancellationToken);
        var bill = new Bill(code);
        await EnsureUsernameAvailableAsync(bill.Id, normalizedHostUsername, cancellationToken);
        bill.Participants.Add(new Participant(normalizedHostUsername, isHost: true));

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

    public Task<BillCalculationResult> CalculateAsync(Guid billId, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => CalculateLockedAsync(billId, token), cancellationToken);
    }

    private async Task<BillCalculationResult> CalculateLockedAsync(Guid billId, CancellationToken cancellationToken)
    {
        var bill = await GetBillAsync(billId, cancellationToken);
        var selections = await GetSelectionsAsync(bill, cancellationToken);
        EnsureCompleteDistribution(bill, selections);

        var participantIds = bill.Participants.Select(participant => participant.Id).ToHashSet();
        var itemTotals = participantIds.ToDictionary(participantId => participantId, _ => 0m);
        decimal itemsTotal = 0;

        foreach (var item in bill.Items)
        {
            var itemSelections = selections.Where(selection => selection.BillItemId == item.Id).ToArray();
            var itemTotal = item.Quantity * item.UnitPrice;
            itemsTotal += itemTotal;

            if (item.SplitType == SplitType.Quantity)
            {
                foreach (var selection in itemSelections)
                {
                    itemTotals[selection.ParticipantId] += selection.Quantity * item.UnitPrice;
                }
            }
            else
            {
                var shares = DistributeEqually(itemTotal, itemSelections.Select(selection => selection.ParticipantId).ToArray());
                AddShares(itemTotals, shares);
            }
        }

        var serviceChargeShares = DistributeEqually(bill.ServiceCharge, participantIds.ToArray());
        var participantResults = bill.Participants
            .OrderBy(participant => participant.Id)
            .Select(participant => new ParticipantCalculationResult(
                participant.Id,
                participant.Username,
                itemTotals[participant.Id],
                serviceChargeShares[participant.Id],
                itemTotals[participant.Id] + serviceChargeShares[participant.Id]))
            .ToArray();

        var total = itemsTotal + bill.ServiceCharge;
        if (participantResults.Sum(participant => participant.Total) != total)
        {
            throw new InvalidOperationException("Calculated participant totals do not match the bill total.");
        }

        return new BillCalculationResult(bill.Id, itemsTotal, bill.ServiceCharge, total, participantResults);
    }

    public async Task<Participant> JoinAsync(string code, string username, CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeCode(code);
        var normalizedUsername = NormalizeParticipantUsername(username, nameof(username));
        var billId = await billReadRepository.GetIdByCodeAsync(normalizedCode, cancellationToken) ?? throw new KeyNotFoundException("Bill was not found.");
        return await ExecuteWithBillLockAsync(billId, token => JoinLockedAsync(billId, normalizedUsername, token), cancellationToken);
    }

    private async Task<Participant> JoinLockedAsync(Guid billId, string username, CancellationToken cancellationToken)
    {
        var bill = await GetBillAsync(billId, cancellationToken);
        EnsureActive(bill);
        await EnsureUsernameAvailableAsync(bill.Id, username, cancellationToken);

        var participant = new Participant(bill.Id, username, isHost: false);
        return await participantWriteRepository.AddAsync(participant, cancellationToken);
    }

    public Task<Bill> ConfirmReceiptAsync(Guid billId, Guid hostParticipantId, ReceiptParseResult receipt, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => ConfirmReceiptLockedAsync(billId, hostParticipantId, receipt, token), cancellationToken);
    }

    private async Task<Bill> ConfirmReceiptLockedAsync(Guid billId, Guid hostParticipantId, ReceiptParseResult receipt, CancellationToken cancellationToken)
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

    public Task<ItemSelection> SelectItemAsync(Guid billId, Guid participantId, Guid billItemId, int quantity = 1, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => SelectItemLockedAsync(billId, participantId, billItemId, quantity, token), cancellationToken);
    }

    private async Task<ItemSelection> SelectItemLockedAsync(Guid billId, Guid participantId, Guid billItemId, int quantity, CancellationToken cancellationToken)
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

    public Task RemoveItemSelectionAsync(Guid billId, Guid participantId, Guid billItemId, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => RemoveItemSelectionLockedAsync(billId, participantId, billItemId, token), cancellationToken);
    }

    private async Task RemoveItemSelectionLockedAsync(Guid billId, Guid participantId, Guid billItemId, CancellationToken cancellationToken)
    {
        var bill = await GetActiveBillAsync(billId, cancellationToken);
        var participant = GetParticipant(bill, participantId);
        GetItem(bill, billItemId);

        var selection = await itemSelectionReadRepository.GetByParticipantAndBillItemAsync(participantId, billItemId, cancellationToken) ?? throw new KeyNotFoundException("Item selection was not found.");

        await ResetReadyAsync(participant, cancellationToken);
        await itemSelectionWriteRepository.DeleteAsync(selection, cancellationToken);
    }

    public Task<ItemSelection> ChangeItemSelectionQuantityAsync(Guid billId, Guid participantId, Guid billItemId, int quantity, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => ChangeItemSelectionQuantityLockedAsync(billId, participantId, billItemId, quantity, token), cancellationToken);
    }

    private async Task<ItemSelection> ChangeItemSelectionQuantityLockedAsync(Guid billId, Guid participantId, Guid billItemId, int quantity, CancellationToken cancellationToken)
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

    public Task ChangeItemSplitTypeAsync(Guid billId, Guid hostParticipantId, Guid billItemId, SplitType splitType, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => ChangeItemSplitTypeLockedAsync(billId, hostParticipantId, billItemId, splitType, token), cancellationToken);
    }

    private async Task ChangeItemSplitTypeLockedAsync(Guid billId, Guid hostParticipantId, Guid billItemId, SplitType splitType, CancellationToken cancellationToken)
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

    public Task<Participant> SetParticipantReadyAsync(Guid billId, Guid participantId, bool isReady, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => SetParticipantReadyLockedAsync(billId, participantId, isReady, token), cancellationToken);
    }

    private async Task<Participant> SetParticipantReadyLockedAsync(Guid billId, Guid participantId, bool isReady, CancellationToken cancellationToken)
    {
        var bill = await GetActiveBillAsync(billId, cancellationToken);
        var participant = GetParticipant(bill, participantId);

        if (participant.IsReady != isReady)
        {
            await participantWriteRepository.SetReadyAsync(participant, isReady, cancellationToken);
        }

        return participant;
    }

    public Task FinalizeAsync(Guid billId, Guid hostParticipantId, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => FinalizeLockedAsync(billId, hostParticipantId, token), cancellationToken);
    }

    private async Task FinalizeLockedAsync(Guid billId, Guid hostParticipantId, CancellationToken cancellationToken)
    {
        var bill = await GetBillAsync(billId, cancellationToken);
        EnsureHost(bill, hostParticipantId);
        EnsureActive(bill);

        if (bill.Participants.Any(participant => !participant.IsReady))
        {
            throw new InvalidOperationException("All participants must be ready before the bill can be finalized.");
        }

        var selections = await GetSelectionsAsync(bill, cancellationToken);
        EnsureCompleteDistribution(bill, selections);

        await billWriteRepository.UpdateStatusAndParticipantsReadyAsync(bill, BillStatus.Finalized, participantsReady: true, cancellationToken);
    }

    public Task ReopenAsync(Guid billId, Guid hostParticipantId, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, token => ReopenLockedAsync(billId, hostParticipantId, token), cancellationToken);
    }

    private async Task ReopenLockedAsync(Guid billId, Guid hostParticipantId, CancellationToken cancellationToken)
    {
        var bill = await GetBillAsync(billId, cancellationToken);
        EnsureHost(bill, hostParticipantId);

        if (bill.Status != BillStatus.Finalized)
        {
            throw new InvalidOperationException("Only a finalized bill can be reopened.");
        }

        await billWriteRepository.UpdateStatusAndParticipantsReadyAsync(bill, BillStatus.Active, participantsReady: false, cancellationToken);
    }

    private async Task<Bill> GetActiveBillAsync(Guid billId, CancellationToken cancellationToken)
    {
        var bill = await billReadRepository.GetWithParticipantsAndItemsAsync(billId, cancellationToken) ?? throw new KeyNotFoundException("Bill was not found.");

        EnsureActive(bill);
        return bill;
    }

    private async Task<Bill> GetBillAsync(Guid billId, CancellationToken cancellationToken)
    {
        return await billReadRepository.GetWithParticipantsAndItemsAsync(billId, cancellationToken) ?? throw new KeyNotFoundException("Bill was not found.");
    }

    private async Task<IReadOnlyList<ItemSelection>> GetSelectionsAsync(Bill bill, CancellationToken cancellationToken)
    {
        var itemIds = bill.Items.Select(item => item.Id).ToArray();
        return await itemSelectionReadRepository.GetByBillItemIdsAsync(itemIds, cancellationToken);
    }

    private static void EnsureCompleteDistribution(Bill bill, IReadOnlyCollection<ItemSelection> selections)
    {
        var participantIds = bill.Participants.Select(participant => participant.Id).ToHashSet();
        if (selections.Any(selection => !participantIds.Contains(selection.ParticipantId)))
        {
            throw new InvalidOperationException("A bill item selection references a participant outside this bill.");
        }

        foreach (var item in bill.Items)
        {
            var itemSelections = selections.Where(selection => selection.BillItemId == item.Id).ToArray();
            if (itemSelections.Any(selection => selection.Quantity <= 0))
            {
                throw new InvalidOperationException("Item selection quantities must be greater than zero.");
            }

            switch (item.SplitType)
            {
                case SplitType.Quantity:
                    var selectedQuantity = itemSelections.Sum(selection => (long)selection.Quantity);
                    if (selectedQuantity != item.Quantity)
                    {
                        throw new InvalidOperationException("Every quantity item must be fully selected before calculation or finalization.");
                    }
                    break;
                case SplitType.Shared:
                    if (itemSelections.Length == 0)
                    {
                        throw new InvalidOperationException("Every shared item must be selected by at least one participant before calculation or finalization.");
                    }

                    break;
                default:
                    throw new InvalidOperationException("The bill contains an unsupported item split type.");
            }
        }
    }

    private static Dictionary<Guid, decimal> DistributeEqually(decimal amount, IReadOnlyCollection<Guid> participantIds)
    {
        var orderedParticipantIds = participantIds.Distinct().Order().ToArray();
        if (orderedParticipantIds.Length == 0)
        {
            throw new InvalidOperationException("An amount cannot be distributed without participants.");
        }

        var totalCents = amount * 100m;
        if (totalCents != decimal.Truncate(totalCents))
        {
            throw new InvalidOperationException("Monetary values must have no more than two decimal places.");
        }

        var baseCents = decimal.Truncate(totalCents / orderedParticipantIds.Length);
        var remainderCents = decimal.ToInt32(totalCents % orderedParticipantIds.Length);
        var shares = new Dictionary<Guid, decimal>(orderedParticipantIds.Length);

        for (var index = 0; index < orderedParticipantIds.Length; index++)
        {
            var cents = baseCents + (index < remainderCents ? 1m : 0m);
            shares.Add(orderedParticipantIds[index], cents / 100m);
        }

        return shares;
    }

    private static void AddShares(IDictionary<Guid, decimal> participantTotals, IReadOnlyDictionary<Guid, decimal> shares)
    {
        foreach (var (participantId, amount) in shares)
        {
            participantTotals[participantId] += amount;
        }
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

    private Task<T> ExecuteWithBillLockAsync<T>(Guid billId, Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken)
    {
        return billWriteRepository.ExecuteWithBillLockAsync(billId, operation, cancellationToken);
    }

    private Task ExecuteWithBillLockAsync(Guid billId, Func<CancellationToken, Task> operation, CancellationToken cancellationToken)
    {
        return billWriteRepository.ExecuteWithBillLockAsync(billId, operation, cancellationToken);
    }

    private static string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Bill code is required.", nameof(code));
        }

        return code.Trim().ToUpperInvariant();
    }

    private static string NormalizeParticipantUsername(string username, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            throw new ArgumentException("Participant username is required.", parameterName);
        }

        var normalizedUsername = username.Trim();
        if (normalizedUsername.Length > MaximumUsernameLength)
        {
            throw new ArgumentException($"Participant username cannot exceed {MaximumUsernameLength} characters.", parameterName);
        }

        return normalizedUsername;
    }

    private async Task EnsureUsernameAvailableAsync(Guid billId, string username, CancellationToken cancellationToken)
    {
        if (await participantReadRepository.UsernameExistsAsync(billId, username, cancellationToken))
        {
            throw new InvalidOperationException("A participant with this username already exists in the bill.");
        }
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
