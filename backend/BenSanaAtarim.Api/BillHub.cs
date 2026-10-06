using BenSanaAtarim.Application.Services;
using Microsoft.AspNetCore.SignalR;

namespace BenSanaAtarim.Api;

public sealed class BillHub(IBillService billService) : Hub
{
    public async Task<BillDetailsResponse> JoinBill(string code, string accessToken)
    {
        var details = await billService.GetByCodeForParticipantAsync(code, accessToken, Context.ConnectionAborted);
        if (details is null)
        {
            throw new HubException("Bill or participant access was not found.");
        }

        var groupName = GetGroupName(details.Bill.Id);
        try
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName, Context.ConnectionAborted);

            var currentDetails = await billService.GetByCodeForParticipantAsync(code, accessToken, Context.ConnectionAborted);
            if (currentDetails is null)
            {
                throw new HubException("Bill or participant access was not found.");
            }

            return currentDetails.ToResponse();
        }
        catch
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName, CancellationToken.None);
            throw;
        }
    }

    public static string GetGroupName(Guid billId) => $"bill:{billId:N}";
}
