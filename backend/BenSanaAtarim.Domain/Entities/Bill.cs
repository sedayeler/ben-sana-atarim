using BenSanaAtarim.Domain.Common;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Domain.Entities;

public class Bill : BaseEntity
{
    public Bill(string code)
    {
        Code = code;
        Status = BillStatus.Active;
        ServiceCharge = 0;
        CreatedAt = DateTime.UtcNow;
    }

    public string Code { get; private set; }
    public BillStatus Status { get; private set; }
    public decimal ServiceCharge { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public ICollection<Participant> Participants { get; } = new List<Participant>();
    public ICollection<BillItem> Items { get; } = new List<BillItem>();
}
