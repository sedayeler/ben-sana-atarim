using BenSanaAtarim.Domain.Common;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Domain.Entities;

public class Bill : BaseEntity
{
    public string Code { get; private set; }
    public BillStatus Status { get; private set; }
    public decimal ServiceCharge { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public ICollection<Participant> Participants { get; } = new List<Participant>();
    public ICollection<BillItem> Items { get; } = new List<BillItem>();
}
