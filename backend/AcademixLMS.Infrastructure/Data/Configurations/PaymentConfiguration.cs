using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Type).IsRequired();
        builder.Property(p => p.Status).IsRequired();
        builder.Property(p => p.Amount).IsRequired();

        builder.Property(p => p.Currency)
            .IsRequired()
            .HasMaxLength(3);

        builder.Property(p => p.LahzaReference)
            .HasMaxLength(200);

        builder.Property(p => p.LahzaAuthorizationCode)
            .HasMaxLength(200);

        builder.Property(p => p.LahzaChannel)
            .HasMaxLength(50);

        builder.HasIndex(p => p.LahzaReference)
            .IsUnique()
            .HasFilter("\"LahzaReference\" IS NOT NULL");

        builder.HasIndex(p => p.UserId);
        builder.HasIndex(p => p.Status);

        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Course)
            .WithMany()
            .HasForeignKey(p => p.CourseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.Subscription)
            .WithMany(s => s.Payments)
            .HasForeignKey(p => p.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.Discount)
            .WithMany(d => d.Payments)
            .HasForeignKey(p => p.DiscountId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
