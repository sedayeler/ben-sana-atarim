using BenSanaAtarim.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BenSanaAtarim.Infrastructure.Persistence;

public sealed class BenSanaAtarimDbContext(DbContextOptions<BenSanaAtarimDbContext> options) : DbContext(options)
{
    public DbSet<Bill> bills => Set<Bill>();
    public DbSet<Participant> participants => Set<Participant>();
    public DbSet<BillItem> bill_items => Set<BillItem>();
    public DbSet<ItemSelection> item_selections => Set<ItemSelection>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Bill>(entity =>
        {
            entity.HasKey(bill => bill.Id);
            entity.Property(bill => bill.Code).IsRequired().HasMaxLength(12);
            entity.Property(bill => bill.ServiceCharge).HasPrecision(10, 2);
            entity.HasIndex(bill => bill.Code).IsUnique();

            entity.HasMany(bill => bill.Participants)
                .WithOne()
                .HasForeignKey(participant => participant.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(bill => bill.Items)
                .WithOne()
                .HasForeignKey(item => item.BillId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Participant>(entity =>
        {
            entity.HasKey(participant => participant.Id);
            entity.Property(participant => participant.Username).IsRequired().HasMaxLength(50);
            entity.Property<string>("UsernameNormalized").HasComputedColumnSql("lower(\"Username\")", stored: true).IsRequired();
            entity.HasIndex("BillId", "UsernameNormalized").IsUnique();
        });

        modelBuilder.Entity<BillItem>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).IsRequired().HasMaxLength(150);
            entity.Property(item => item.UnitPrice).HasPrecision(10, 2);
        });

        modelBuilder.Entity<ItemSelection>(entity =>
        {
            entity.HasKey(selection => selection.Id);
            entity.HasIndex(selection => new { selection.ParticipantId, selection.BillItemId }).IsUnique();

            entity.HasOne<BillItem>()
                .WithMany()
                .HasForeignKey(selection => selection.BillItemId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Participant>()
                .WithMany()
                .HasForeignKey(selection => selection.ParticipantId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
