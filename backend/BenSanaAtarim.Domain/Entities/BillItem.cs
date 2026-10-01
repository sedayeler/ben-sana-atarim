using BenSanaAtarim.Domain.Common;
using BenSanaAtarim.Domain.Enums;

namespace BenSanaAtarim.Domain.Entities;

public class BillItem : BaseEntity
{
    public BillItem(string name, int quantity, decimal unitPrice, SplitType splitType)
    {
        Name = name;
        Quantity = quantity;
        UnitPrice = unitPrice;
        SplitType = splitType;
    }

    public Guid BillId { get; private set; }
    public string Name { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public SplitType SplitType { get; private set; }
}
