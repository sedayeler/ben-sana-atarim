using BenSanaAtarim.Domain.Common;

namespace BenSanaAtarim.Domain.Entities;

public class Participant : BaseEntity
{
    public Participant(string username, string accessTokenHash, bool isHost)
    {
        Username = username;
        AccessTokenHash = accessTokenHash;
        IsHost = isHost;
        IsReady = false;
    }

    public Participant(Guid billId, string username, string accessTokenHash, bool isHost) : this(username, accessTokenHash, isHost)
    {
        BillId = billId;
    }

    public Guid BillId { get; private set; }
    public string Username { get; private set; }
    public string? AccessTokenHash { get; private set; }
    public bool IsHost { get; private set; }
    public bool IsReady { get; private set; }
}
