using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class SupportTicketConfiguration : IEntityTypeConfiguration<SupportTicket>
{
    public void Configure(EntityTypeBuilder<SupportTicket> builder)
    {
        builder.ToTable("SupportTickets");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Subject).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Message).IsRequired().HasMaxLength(4000);

        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.AssignedTo)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(t => t.Replies)
            .WithOne(r => r.Ticket)
            .HasForeignKey(r => r.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => new { t.Status, t.CreatedAt })
            .HasFilter("\"IsDeleted\" = false");
        builder.HasIndex(t => t.UserId).HasFilter("\"IsDeleted\" = false");
    }
}

public class SupportTicketReplyConfiguration : IEntityTypeConfiguration<SupportTicketReply>
{
    public void Configure(EntityTypeBuilder<SupportTicketReply> builder)
    {
        builder.ToTable("SupportTicketReplies");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Message).IsRequired().HasMaxLength(4000);

        builder.HasOne(r => r.Author)
            .WithMany()
            .HasForeignKey(r => r.AuthorUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.TicketId).HasFilter("\"IsDeleted\" = false");
    }
}
