using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class ExamConfiguration : IEntityTypeConfiguration<Exam>
{
    public void Configure(EntityTypeBuilder<Exam> builder)
    {
        builder.ToTable("Exams");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(e => e.Description)
            .HasMaxLength(2000);

        builder.HasMany(e => e.Questions)
            .WithOne(q => q.Exam)
            .HasForeignKey(q => q.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Attempts)
            .WithOne(a => a.Exam)
            .HasForeignKey(a => a.ExamId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ExamQuestionConfiguration : IEntityTypeConfiguration<ExamQuestion>
{
    public void Configure(EntityTypeBuilder<ExamQuestion> builder)
    {
        builder.ToTable("ExamQuestions");

        builder.HasKey(q => q.Id);

        builder.Property(q => q.Prompt)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(q => q.ChoicesJson)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(q => q.Points)
            .HasPrecision(5, 2);

        builder.HasIndex(q => new { q.ExamId, q.Order });
    }
}

public class ExamAttemptConfiguration : IEntityTypeConfiguration<ExamAttempt>
{
    public void Configure(EntityTypeBuilder<ExamAttempt> builder)
    {
        builder.ToTable("ExamAttempts");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.AnswersJson)
            .HasMaxLength(5000);

        builder.Property(a => a.ShortAnswerTextJson)
            .HasMaxLength(5000);

        builder.Property(a => a.Percentage)
            .HasPrecision(5, 2);

        // Index for user's attempts on an exam
        builder.HasIndex(a => new { a.ExamId, a.UserId });
    }
}


