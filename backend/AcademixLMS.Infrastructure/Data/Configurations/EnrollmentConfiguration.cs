using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class EnrollmentConfiguration : IEntityTypeConfiguration<Enrollment>
{
    public void Configure(EntityTypeBuilder<Enrollment> builder)
    {
        builder.ToTable("Enrollments");

        builder.HasKey(e => e.Id);

        // Unique constraint: One ACTIVE enrollment per user per section
        // This allows re-enrollment after cancellation by only enforcing uniqueness for non-deleted records
        builder.HasIndex(e => new { e.UserId, e.CourseId, e.SectionId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.Property(e => e.EnrolledAt)
            .IsRequired();

        builder.Property(e => e.ProgressPercentage)
            .HasPrecision(5, 2);

        // Index for querying user enrollments (not unique - allows historical enrollments)
        builder.HasIndex(e => new { e.UserId, e.CourseId })
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(e => e.AssignedByOrg)
            .WithMany()
            .HasForeignKey(e => e.AssignedByOrgId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.CourseLicense)
            .WithMany(l => l.Assignments)
            .HasForeignKey(e => e.CourseLicenseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(e => e.AssignedByOrgId)
            .HasFilter("\"IsDeleted\" = false");
    }
}


