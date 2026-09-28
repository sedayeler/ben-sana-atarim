using BenSanaAtarim.Domain.Common;

namespace BenSanaAtarim.Domain.Entities;

public class ItemSelection : BaseEntity
{
    public Guid BillItemId { get; private set; }
    public Guid ParticipantId { get; private set; }
    public int Quantity { get; private set; }
}
