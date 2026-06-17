using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Action).IsRequired().HasMaxLength(120);
        builder.Property(x => x.Category).IsRequired().HasMaxLength(60);
        builder.Property(x => x.ActorEmail).IsRequired().HasMaxLength(256);
        builder.Property(x => x.ActorRole).IsRequired().HasMaxLength(120);
        builder.Property(x => x.Target).IsRequired().HasMaxLength(256);
        builder.Property(x => x.Description).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.IpAddress).IsRequired().HasMaxLength(80);
        builder.Property(x => x.Method).IsRequired().HasMaxLength(16);
        builder.Property(x => x.Path).IsRequired().HasMaxLength(512);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(40);
        builder.Property(x => x.CorrelationId).HasMaxLength(80);

        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => x.Category);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.ActorEmail);
    }
}
