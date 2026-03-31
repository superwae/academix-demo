using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class LessonConfiguration : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> builder)
    {
        builder.ToTable("Lessons");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(l => l.Description)
            .HasMaxLength(2000);

        builder.Property(l => l.VideoUrl)
            .HasMaxLength(500);

        // Index for querying lessons by course
        builder.HasIndex(l => new { l.CourseId, l.Order })
            .HasFilter("\"IsDeleted\" = false");

        // Relationships
        builder.HasOne(l => l.Course)
            .WithMany(c => c.Lessons)
            .HasForeignKey(l => l.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(l => l.Section)
            .WithMany(s => s.Lessons)
            .HasForeignKey(l => l.SectionId)
            .OnDelete(DeleteBehavior.SetNull); // If section is deleted, lesson remains but section is null
    }
}

public class LessonSectionConfiguration : IEntityTypeConfiguration<LessonSection>
{
    public void Configure(EntityTypeBuilder<LessonSection> builder)
    {
        builder.ToTable("LessonSections");

        builder.HasKey(ls => ls.Id);

        builder.Property(ls => ls.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ls => ls.Description)
            .HasMaxLength(1000);

        // Index for querying sections by course
        builder.HasIndex(ls => new { ls.CourseId, ls.Order })
            .HasFilter("\"IsDeleted\" = false");

        // Relationships
        builder.HasOne(ls => ls.Course)
            .WithMany(c => c.LessonSections)
            .HasForeignKey(ls => ls.CourseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class LessonProgressConfiguration : IEntityTypeConfiguration<LessonProgress>
{
    public void Configure(EntityTypeBuilder<LessonProgress> builder)
    {
        builder.ToTable("LessonProgresses");

        builder.HasKey(lp => lp.Id);

        // Unique constraint: One progress record per user per lesson
        builder.HasIndex(lp => new { lp.UserId, lp.LessonId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        // Index for querying progress by course and user
        builder.HasIndex(lp => new { lp.UserId, lp.CourseId })
            .HasFilter("\"IsDeleted\" = false");

        // Relationships
        builder.HasOne(lp => lp.User)
            .WithMany()
            .HasForeignKey(lp => lp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(lp => lp.Lesson)
            .WithMany(l => l.Progresses)
            .HasForeignKey(lp => lp.LessonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(lp => lp.Course)
            .WithMany()
            .HasForeignKey(lp => lp.CourseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}


