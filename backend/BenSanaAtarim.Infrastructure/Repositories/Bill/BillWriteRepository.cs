using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Domain.Entities;
using BenSanaAtarim.Domain.Enums;
using BenSanaAtarim.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Repositories;

public sealed class BillWriteRepository : WriteRepository<Bill>, IBillWriteRepository
{
    private readonly BenSanaAtarimDbContext _context;

    public BillWriteRepository(BenSanaAtarimDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task UpdateReceiptAsync(Bill bill, decimal serviceCharge, CancellationToken cancellationToken = default)
    {
        _context.Entry(bill).Property(entity => entity.ServiceCharge).CurrentValue = serviceCharge;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateStatusAndParticipantsReadyAsync(Bill bill, BillStatus status, bool participantsReady, CancellationToken cancellationToken = default)
    {
        _context.Attach(bill);
        var statusProperty = _context.Entry(bill).Property(entity => entity.Status);
        statusProperty.CurrentValue = status;
        statusProperty.IsModified = true;

        foreach (var participant in bill.Participants)
        {
            var readyProperty = _context.Entry(participant).Property(entity => entity.IsReady);
            if (readyProperty.CurrentValue != participantsReady)
            {
                readyProperty.CurrentValue = participantsReady;
                readyProperty.IsModified = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<T> ExecuteWithBillLockAsync<T>(Guid billId, Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken = default)
    {
        if (_context.ChangeTracker.HasChanges())
        {
            throw new InvalidOperationException("Cannot acquire a bill lock while the DbContext has unsaved changes.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        await _context.bills
            .FromSqlInterpolated($"SELECT * FROM bills WHERE \"Id\" = {billId} FOR UPDATE")
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        _context.ChangeTracker.Clear();

        var result = await operation(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }

    public Task ExecuteWithBillLockAsync(Guid billId, Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        return ExecuteWithBillLockAsync(billId, async token =>
        {
            await operation(token);
            return true;
        }, cancellationToken);
    }
}
