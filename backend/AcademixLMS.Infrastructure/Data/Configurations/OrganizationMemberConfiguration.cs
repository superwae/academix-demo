using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class OrganizationMemberConfiguration : IEntityTypeConfiguration<OrganizationMember>
{
    public void Configure(EntityTypeBuilder<OrganizationMember> builder)
    {
        builder.ToTable("OrganizationMembers");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.ExternalReference).HasMaxLength(100);
        builder.Property(m => m.InviteToken).HasMaxLength(200);

        // Unique active membership: one active (user, org) pair at a time
        builder.HasIndex(m => new { m.OrganizationId, m.UserId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false AND \"IsActive\" = true");

        builder.HasOne(m => m.User)
            .WithMany(u => u.OrganizationMemberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => m.InviteToken)
            .HasFilter("\"InviteToken\" IS NOT NULL AND \"IsDeleted\" = false");
    }
}
