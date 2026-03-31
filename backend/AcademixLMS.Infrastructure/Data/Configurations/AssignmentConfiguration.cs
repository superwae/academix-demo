using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class AssignmentConfiguration : IEntityTypeConfiguration<Assignment>
{
    public void Configure(EntityTypeBuilder<Assignment> builder)
    {
        builder.ToTable("Assignments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.Prompt)
            .HasMaxLength(5000);

        builder.Property(a => a.MaxScore)
            .HasPrecision(10, 2);

        builder.Property(a => a.Weight)
            .HasPrecision(5, 2);

        builder.HasMany(a => a.Submissions)
            .WithOne(s => s.Assignment)
            .HasForeignKey(s => s.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class AssignmentSubmissionConfiguration : IEntityTypeConfiguration<AssignmentSubmission>
{
    public void Configure(EntityTypeBuilder<AssignmentSubmission> builder)
    {
        builder.ToTable("AssignmentSubmissions");

        builder.HasKey(s => s.Id);

        // One submission per user per assignment
        builder.HasIndex(s => new { s.AssignmentId, s.UserId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.Property(s => s.Text)
            .HasMaxLength(10000);

        builder.Property(s => s.FileName)
            .HasMaxLength(500);

        builder.Property(s => s.FileUrl)
            .HasMaxLength(1000);

        builder.Property(s => s.InstructorScore)
            .HasPrecision(10, 2);

        builder.Property(s => s.Score)
            .HasPrecision(10, 2);

        builder.Property(s => s.Feedback)
            .HasMaxLength(2000);

        // Configure User relationship (student who submitted)
        builder.HasOne(s => s.User)
            .WithMany(u => u.Submissions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // Configure Grader relationship (optional - grader may not be set)
        // Note: User doesn't have a navigation property for graded submissions, so use WithMany() without parameter
        builder.HasOne(s => s.Grader)
            .WithMany()
            .HasForeignKey(s => s.GradedBy)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}


