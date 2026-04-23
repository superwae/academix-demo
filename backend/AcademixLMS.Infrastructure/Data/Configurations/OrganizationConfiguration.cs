using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.ToTable("Organizations");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(o => o.Slug)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(o => o.Description)
            .HasMaxLength(2000);

        builder.Property(o => o.LogoUrl)
            .HasMaxLength(500);

        builder.Property(o => o.Website)
            .HasMaxLength(500);

        builder.Property(o => o.ContactEmail)
            .HasMaxLength(200);

        builder.Property(o => o.PlatformFeePercent)
            .HasPrecision(5, 2);

        builder.Property(o => o.OrgFeePercent)
            .HasPrecision(5, 2);

        builder.HasIndex(o => o.Slug)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(o => o.Owner)
            .WithMany(u => u.OwnedOrganizations)
            .HasForeignKey(o => o.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Subscription)
            .WithMany()
            .HasForeignKey(o => o.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(o => o.Members)
            .WithOne(m => m.Organization)
            .HasForeignKey(m => m.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(o => o.Licenses)
            .WithOne(l => l.Organization)
            .HasForeignKey(l => l.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
