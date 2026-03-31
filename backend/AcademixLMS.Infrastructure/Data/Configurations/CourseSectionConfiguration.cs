using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class CourseSectionConfiguration : IEntityTypeConfiguration<CourseSection>
{
    public void Configure(EntityTypeBuilder<CourseSection> builder)
    {
        builder.ToTable("CourseSections");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.LocationLabel)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.JoinUrl)
            .HasMaxLength(500);

        builder.HasMany(s => s.MeetingTimes)
            .WithOne(mt => mt.Section)
            .HasForeignKey(mt => mt.SectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Enrollments)
            .WithOne(e => e.Section)
            .HasForeignKey(e => e.SectionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class SectionMeetingTimeConfiguration : IEntityTypeConfiguration<SectionMeetingTime>
{
    public void Configure(EntityTypeBuilder<SectionMeetingTime> builder)
    {
        builder.ToTable("SectionMeetingTimes");

        builder.HasKey(mt => mt.Id);

        builder.Property(mt => mt.StartMinutes)
            .IsRequired();

        builder.Property(mt => mt.EndMinutes)
            .IsRequired();
    }
}


