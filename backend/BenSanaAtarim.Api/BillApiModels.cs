using BenSanaAtarim.Application.AI.Models;
using BenSanaAtarim.Application.Services.Models;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Api;

public sealed record CreateBillRequest(string Username);
public sealed record JoinBillRequest(string Username);
public sealed record SelectItemRequest(int Quantity = 1);
public sealed record ChangeQuantityRequest(int Quantity);
public sealed record ChangeSplitTypeRequest(SplitType SplitType);
public sealed record SetReadyRequest(bool IsReady);
public sealed record ConfirmReceiptRequest(decimal ServiceCharge, IReadOnlyList<ConfirmReceiptItemRequest> Items)
{
    public ReceiptParseResult ToResult()
    {
        if (Items is null || Items.Any(item => item is null))
        {
            throw new ArgumentException("Receipt items are required.", nameof(Items));
        }

        return new ReceiptParseResult(ServiceCharge, Items.Select(item => new ReceiptItemResult(item.Name, item.Quantity, item.UnitPrice)).ToArray());
    }
}

public sealed record ConfirmReceiptItemRequest(string Name, int Quantity, decimal UnitPrice);
public sealed record BillSessionResponse(string AccessToken, Guid ParticipantId, string Username, BillDetailsResponse Bill);
public sealed record ParticipantResponse(Guid Id, string Username, bool IsHost, bool IsReady);
public sealed record BillItemResponse(Guid Id, Guid BillId, string Name, int Quantity, decimal UnitPrice, SplitType SplitType);
public sealed record ItemSelectionResponse(Guid Id, Guid BillItemId, Guid ParticipantId, int Quantity);
public sealed record BillDetailsResponse(Guid Id, string Code, BillStatus Status, decimal ServiceCharge, DateTime CreatedAt, IReadOnlyList<ParticipantResponse> Participants, IReadOnlyList<BillItemResponse> Items, IReadOnlyList<ItemSelectionResponse> Selections);

public static class BillApiMapping
{
    public static BillDetailsResponse ToResponse(this BillDetails details)
    {
        return new BillDetailsResponse(details.Bill.Id, details.Bill.Code, details.Bill.Status,
            details.Bill.ServiceCharge, details.Bill.CreatedAt, details.Bill.Participants.Select(ToResponse).ToArray(),
            details.Bill.Items.Select(ToResponse).ToArray(), details.Selections.Select(ToResponse).ToArray());
    }

    public static ParticipantResponse ToResponse(Participant participant) => new(participant.Id, participant.Username, participant.IsHost, participant.IsReady);
    public static BillItemResponse ToResponse(BillItem item) => new(item.Id, item.BillId, item.Name, item.Quantity, item.UnitPrice, item.SplitType);
    public static ItemSelectionResponse ToResponse(ItemSelection selection) => new(selection.Id, selection.BillItemId, selection.ParticipantId, selection.Quantity);
}
