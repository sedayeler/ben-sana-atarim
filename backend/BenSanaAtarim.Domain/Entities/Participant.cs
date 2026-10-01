using BenSanaAtarim.Domain.Common;

namespace BenSanaAtarim.Domain.Entities;

public class Participant : BaseEntity
{
    public Participant(string name, bool isHost)
    {
        Name = name;
        IsHost = isHost;
        IsReady = false;
    }

    public Participant(Guid billId, string name, bool isHost) : this(name, isHost)
    {
        BillId = billId;
    }

    public Guid BillId { get; private set; }
    public string Name { get; private set; }
    public bool IsHost { get; private set; }
    public bool IsReady { get; private set; }
}