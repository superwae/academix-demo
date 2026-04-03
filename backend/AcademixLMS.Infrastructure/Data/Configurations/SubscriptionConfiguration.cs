using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.ToTable("Subscriptions");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.BillingInterval).IsRequired();
        builder.Property(s => s.Status).IsRequired();

        builder.Property(s => s.LahzaSubscriptionCode)
            .HasMaxLength(200);

        builder.Property(s => s.LahzaCustomerCode)
            .HasMaxLength(200);

        // Only one active subscription per user
        builder.HasIndex(s => new { s.UserId, s.Status })
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Plan)
            .WithMany(p => p.Subscriptions)
            .HasForeignKey(s => s.PlanId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
