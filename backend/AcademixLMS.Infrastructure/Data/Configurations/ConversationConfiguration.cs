using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcademixLMS.Infrastructure.Data.Configurations;

public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("Conversations");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Type)
            .IsRequired();

        builder.Property(c => c.Title)
            .HasMaxLength(200);

        builder.Property(c => c.LastMessageAt)
            .IsRequired();

        // Relationships
        builder.HasOne(c => c.Course)
            .WithMany()
            .HasForeignKey(c => c.CourseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.Participants)
            .WithOne(p => p.Conversation)
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.Messages)
            .WithOne(m => m.Conversation)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(c => c.CourseId);
        builder.HasIndex(c => c.Type);
        builder.HasIndex(c => c.LastMessageAt);
    }
}

public class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant>
{
    public void Configure(EntityTypeBuilder<ConversationParticipant> builder)
    {
        builder.ToTable("ConversationParticipants");

        builder.HasKey(cp => cp.Id);

        builder.Property(cp => cp.JoinedAt)
            .IsRequired();

        // Relationships
        builder.HasOne(cp => cp.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(cp => cp.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(cp => cp.User)
            .WithMany(u => u.ConversationParticipants)
            .HasForeignKey(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(cp => new { cp.ConversationId, cp.UserId })
            .IsUnique();
        builder.HasIndex(cp => cp.UserId);
    }
}

public class ConversationMessageConfiguration : IEntityTypeConfiguration<ConversationMessage>
{
    public void Configure(EntityTypeBuilder<ConversationMessage> builder)
    {
        builder.ToTable("ConversationMessages");

        builder.HasKey(cm => cm.Id);

        builder.Property(cm => cm.Content)
            .IsRequired()
            .HasMaxLength(5000);

        builder.Property(cm => cm.SentAt)
            .IsRequired();

        // Relationships
        builder.HasOne(cm => cm.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(cm => cm.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(cm => cm.Sender)
            .WithMany(u => u.SentConversationMessages)
            .HasForeignKey(cm => cm.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(cm => cm.ConversationId);
        builder.HasIndex(cm => cm.SenderId);
        builder.HasIndex(cm => cm.SentAt);
    }
}

public class ConversationRequestConfiguration : IEntityTypeConfiguration<ConversationRequest>
{
    public void Configure(EntityTypeBuilder<ConversationRequest> builder)
    {
        builder.ToTable("ConversationRequests");

        builder.HasKey(cr => cr.Id);

        builder.Property(cr => cr.Status)
            .IsRequired();

        builder.Property(cr => cr.Message)
            .HasMaxLength(500);

        builder.Property(cr => cr.RequestedAt)
            .IsRequired();

        // Relationships
        builder.HasOne(cr => cr.Requester)
            .WithMany(u => u.SentRequests)
            .HasForeignKey(cr => cr.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(cr => cr.Receiver)
            .WithMany(u => u.ReceivedRequests)
            .HasForeignKey(cr => cr.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(cr => cr.RequesterId);
        builder.HasIndex(cr => cr.ReceiverId);
        builder.HasIndex(cr => cr.Status);
        builder.HasIndex(cr => new { cr.RequesterId, cr.ReceiverId, cr.Status });
    }
}

public class BlockedUserConfiguration : IEntityTypeConfiguration<BlockedUser>
{
    public void Configure(EntityTypeBuilder<BlockedUser> builder)
    {
        builder.ToTable("BlockedUsers");

        builder.HasKey(bu => bu.Id);

        builder.Property(bu => bu.BlockedAt)
            .IsRequired();

        builder.Property(bu => bu.Reason)
            .HasMaxLength(500);

        // Relationships
        builder.HasOne(bu => bu.Blocker)
            .WithMany(u => u.BlockedUsers)
            .HasForeignKey(bu => bu.BlockerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(bu => bu.Blocked)
            .WithMany(u => u.BlockedByUsers)
            .HasForeignKey(bu => bu.BlockedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(bu => bu.BlockerId);
        builder.HasIndex(bu => bu.BlockedUserId);
        builder.HasIndex(bu => new { bu.BlockerId, bu.BlockedUserId })
            .IsUnique();
    }
}

public class ReportedUserConfiguration : IEntityTypeConfiguration<ReportedUser>
{
    public void Configure(EntityTypeBuilder<ReportedUser> builder)
    {
        builder.ToTable("ReportedUsers");

        builder.HasKey(ru => ru.Id);

        builder.Property(ru => ru.Reason)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ru => ru.Details)
            .HasMaxLength(2000);

        builder.Property(ru => ru.ReportedAt)
            .IsRequired();

        builder.Property(ru => ru.ReviewNotes)
            .HasMaxLength(1000);

        // Relationships
        builder.HasOne(ru => ru.Reporter)
            .WithMany(u => u.ReportedUsers)
            .HasForeignKey(ru => ru.ReporterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ru => ru.Reported)
            .WithMany(u => u.ReportedByUsers)
            .HasForeignKey(ru => ru.ReportedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(ru => ru.Reviewer)
            .WithMany()
            .HasForeignKey(ru => ru.ReviewedBy)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(ru => ru.ReporterId);
        builder.HasIndex(ru => ru.ReportedUserId);
        builder.HasIndex(ru => ru.IsReviewed);
    }
}


