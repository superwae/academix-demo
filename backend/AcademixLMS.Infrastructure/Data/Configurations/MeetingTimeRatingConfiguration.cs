using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class MeetingTimeRatingConfiguration : IEntityTypeConfiguration<MeetingTimeRating>
{
    public void Configure(EntityTypeBuilder<MeetingTimeRating> builder)
    {
        builder.ToTable("MeetingTimeRatings");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Rating).IsRequired();
        builder.Property(x => x.Comment).HasMaxLength(2000);

        builder.HasIndex(x => new { x.UserId, x.SectionMeetingTimeId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.MeetingTime)
            .WithMany(m => m.Ratings)
            .HasForeignKey(x => x.SectionMeetingTimeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
