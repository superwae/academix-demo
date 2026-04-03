using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class DiscountConfiguration : IEntityTypeConfiguration<Discount>
{
    public void Configure(EntityTypeBuilder<Discount> builder)
    {
        builder.ToTable("Discounts");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Code)
            .HasMaxLength(50);

        builder.Property(d => d.Type).IsRequired();

        builder.Property(d => d.Value)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.HasIndex(d => new { d.CourseId, d.Code })
            .IsUnique()
            .HasFilter("\"Code\" IS NOT NULL AND \"IsDeleted\" = false");

        builder.HasIndex(d => d.CourseId);

        builder.HasOne(d => d.Course)
            .WithMany()
            .HasForeignKey(d => d.CourseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
