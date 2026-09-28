using BenSanaAtarim.Domain.Entities;

namespace BenSanaAtarim.Application.Services;

public interface IBillService
{
    Task<Bill> CreateBillAsync(string hostName, CancellationToken cancellationToken = default);
}
