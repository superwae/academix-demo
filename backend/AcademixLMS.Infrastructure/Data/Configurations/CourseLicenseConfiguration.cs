using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class CourseLicenseConfiguration : IEntityTypeConfiguration<CourseLicense>
{
    public void Configure(EntityTypeBuilder<CourseLicense> builder)
    {
        builder.ToTable("CourseLicenses");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Currency).HasMaxLength(3).IsRequired();
        builder.Property(l => l.PricePerSeat).HasPrecision(10, 2);
        builder.Property(l => l.TotalAmount).HasPrecision(12, 2);

        builder.HasOne(l => l.Course)
            .WithMany()
            .HasForeignKey(l => l.CourseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(l => new { l.OrganizationId, l.CourseId })
            .HasFilter("\"IsDeleted\" = false");
    }
}
