using BenSanaAtarim.Domain.Common;

namespace BenSanaAtarim.Domain.Entities;

public class Participant : BaseEntity
{
    public Participant(string username, bool isHost)
    {
        Username = username;
        IsHost = isHost;
        IsReady = false;
    }

    public Participant(Guid billId, string username, bool isHost) : this(username, isHost)
    {
        BillId = billId;
    }

    public Guid BillId { get; private set; }
    public string Username { get; private set; }
    public bool IsHost { get; private set; }
    public bool IsReady { get; private set; }
}
