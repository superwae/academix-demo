using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Messaging;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class ConversationService : IConversationService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<ConversationService> _logger;

    public ConversationService(
        IApplicationDbContext context,
        ILogger<ConversationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<ConversationDto>>> GetUserConversationsAsync(Guid userId)
    {
        try
        {
            var blockedUserIds = await GetBlockedUserIdsAsync(userId);
            var blockedIds = blockedUserIds.Value ?? new List<Guid>();

            var conversations = await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                        .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
                    .ThenInclude(m => m.Sender)
                        .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Include(c => c.Course)
                .Where(c => c.Participants.Any(p => p.UserId == userId && p.IsActive && !p.Conversation.IsDeleted))
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            var conversationDtos = new List<ConversationDto>();

            foreach (var conversation in conversations)
            {
                var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId);
                if (participant == null) continue;

                // Filter out conversations with blocked users
                var otherParticipants = conversation.Participants
                    .Where(p => p.UserId != userId && p.IsActive)
                    .Select(p => p.UserId)
                    .ToList();

                if (otherParticipants.Any(id => blockedIds.Contains(id)))
                    continue;

                var unreadCount = await _context.ConversationMessages
                    .CountAsync(m => m.ConversationId == conversation.Id &&
                                   m.SenderId != userId &&
                                   (participant.LastReadAt == null || m.SentAt > participant.LastReadAt) &&
                                   !m.IsDeleted);

                var lastMessage = conversation.Messages
                    .Where(m => !m.IsDeleted)
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefault();

                var dto = MapToConversationDto(conversation, userId, unreadCount, lastMessage);
                conversationDtos.Add(dto);
            }

            return Result<List<ConversationDto>>.Success(conversationDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user conversations");
            return Result<List<ConversationDto>>.Failure("Failed to retrieve conversations.");
        }
    }

    public async Task<Result<ConversationDto>> GetConversationByIdAsync(Guid conversationId, Guid userId)
    {
        try
        {
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                        .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Include(c => c.Course)
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                return Result<ConversationDto>.Failure("Conversation not found.");

            var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId && p.IsActive);
            if (participant == null)
                return Result<ConversationDto>.Failure("You are not a participant in this conversation.");

            var unreadCount = await _context.ConversationMessages
                .CountAsync(m => m.ConversationId == conversationId &&
                               m.SenderId != userId &&
                               (participant.LastReadAt == null || m.SentAt > participant.LastReadAt) &&
                               !m.IsDeleted);

            var lastMessage = await _context.ConversationMessages
                .Include(m => m.Sender)
                    .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();

            var dto = MapToConversationDto(conversation, userId, unreadCount, lastMessage);
            return Result<ConversationDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversation by ID");
            return Result<ConversationDto>.Failure("Failed to retrieve conversation.");
        }
    }

    public async Task<Result<ConversationDto>> CreateConversationAsync(CreateConversationRequest request, Guid userId)
    {
        try
        {
            // Check if user is blocked
            var isBlocked = await _context.BlockedUsers
                .AnyAsync(b => (b.BlockerId == userId && b.BlockedUserId == request.OtherUserId) ||
                              (b.BlockerId == request.OtherUserId && b.BlockedUserId == userId));

            if (isBlocked && request.Type == "Direct")
                return Result<ConversationDto>.Failure("Cannot create conversation with blocked user.");

            if (request.Type == "Direct")
            {
                if (!request.OtherUserId.HasValue)
                    return Result<ConversationDto>.Failure("OtherUserId is required for Direct conversations.");

                // Check if conversation already exists
                var existing = await _context.Conversations
                    .Include(c => c.Participants)
                    .FirstOrDefaultAsync(c => c.Type == ConversationType.Direct &&
                                            c.Participants.Any(p => p.UserId == userId) &&
                                            c.Participants.Any(p => p.UserId == request.OtherUserId.Value) &&
                                            !c.IsDeleted);

                if (existing != null)
                {
                    var dto = await MapToConversationDtoAsync(existing, userId);
                    return Result<ConversationDto>.Success(dto);
                }

                // Check user roles for Teacher-Student auto-approval
                var requester = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                var otherUser = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == request.OtherUserId.Value);

                if (requester == null || otherUser == null)
                    return Result<ConversationDto>.Failure("User not found.");

                // Direct chat allowed without a "conversation request" when at least one participant
                // is staff (Admin/SuperAdmin) or Instructor. SuperAdmin was missing before, so admins
                // with only that role were misclassified as students.
                var requesterCanOpenDirect = UserCanOpenDirectChat(requester);
                var otherCanOpenDirect = UserCanOpenDirectChat(otherUser);

                if (!requesterCanOpenDirect && !otherCanOpenDirect)
                {
                    return Result<ConversationDto>.Failure(
                        "Student-to-student conversations require approval. Please send a conversation request.");
                }

                var conversation = new Conversation
                {
                    Type = ConversationType.Direct,
                    CreatedBy = userId,
                };

                _context.Conversations.Add(conversation);

                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationId = conversation.Id,
                    UserId = userId,
                    CreatedBy = userId,
                });

                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationId = conversation.Id,
                    UserId = request.OtherUserId.Value,
                    CreatedBy = userId,
                });

                await _context.SaveChangesAsync();

                var createdDto = await MapToConversationDtoAsync(conversation, userId);
                return Result<ConversationDto>.Success(createdDto);
            }
            else if (request.Type == "Course")
            {
                if (!request.CourseId.HasValue)
                    return Result<ConversationDto>.Failure("CourseId is required for Course conversations.");

                return await GetOrCreateCourseChatAsync(request.CourseId.Value, userId);
            }

            return Result<ConversationDto>.Failure("Invalid conversation type.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating conversation");
            return Result<ConversationDto>.Failure("Failed to create conversation.");
        }
    }

    public async Task<Result<List<ConversationMessageDto>>> GetConversationMessagesAsync(
        Guid conversationId, Guid userId, int pageNumber = 1, int pageSize = 50)
    {
        try
        {
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);

            if (conversation == null)
                return Result<List<ConversationMessageDto>>.Failure("Conversation not found.");

            var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId && p.IsActive);
            if (participant == null)
                return Result<List<ConversationMessageDto>>.Failure("You are not a participant in this conversation.");

            var skip = (pageNumber - 1) * pageSize;
            var messages = await _context.ConversationMessages
                .Include(m => m.Sender)
                    .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .OrderByDescending(m => m.SentAt)
                .Skip(skip)
                .Take(pageSize)
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            var messageDtos = messages.Select(m => MapToMessageDto(m)).ToList();
            return Result<List<ConversationMessageDto>>.Success(messageDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting conversation messages");
            return Result<List<ConversationMessageDto>>.Failure("Failed to retrieve messages.");
        }
    }

    public async Task<Result<ConversationMessageDto>> SendMessageAsync(SendMessageRequest request, Guid userId)
    {
        try
        {
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == request.ConversationId && !c.IsDeleted);

            if (conversation == null)
                return Result<ConversationMessageDto>.Failure("Conversation not found.");

            var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId && p.IsActive);
            if (participant == null)
                return Result<ConversationMessageDto>.Failure("You are not a participant in this conversation.");

            // Check if user is blocked by any participant
            var otherParticipantIds = conversation.Participants
                .Where(p => p.UserId != userId && p.IsActive)
                .Select(p => p.UserId)
                .ToList();

            var isBlocked = await _context.BlockedUsers
                .AnyAsync(b => otherParticipantIds.Contains(b.BlockerId) && b.BlockedUserId == userId);

            if (isBlocked)
                return Result<ConversationMessageDto>.Failure("You are blocked from sending messages in this conversation.");

            var message = new ConversationMessage
            {
                ConversationId = request.ConversationId,
                SenderId = userId,
                Content = request.Content.Trim(),
                SentAt = DateTime.UtcNow,
                CreatedBy = userId,
            };

            _context.ConversationMessages.Add(message);

            // Update conversation last message time
            conversation.LastMessageAt = DateTime.UtcNow;
            conversation.UpdatedAt = DateTime.UtcNow;
            conversation.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            var reloaded = await _context.ConversationMessages
                .Include(m => m.Sender)
                    .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstAsync(m => m.Id == message.Id);

            var messageDto = MapToMessageDto(reloaded);
            return Result<ConversationMessageDto>.Success(messageDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message");
            return Result<ConversationMessageDto>.Failure("Failed to send message.");
        }
    }

    public async Task<Result> MarkMessagesAsReadAsync(Guid conversationId, Guid userId)
    {
        try
        {
            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId && p.IsActive);

            if (participant == null)
                return Result.Failure("You are not a participant in this conversation.");

            participant.LastReadAt = DateTime.UtcNow;
            participant.UpdatedAt = DateTime.UtcNow;
            participant.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking messages as read");
            return Result.Failure("Failed to mark messages as read.");
        }
    }

    public async Task<Result<List<ConversationRequestDto>>> GetPendingRequestsAsync(Guid userId)
    {
        try
        {
            var requests = await _context.ConversationRequests
                .Include(r => r.Requester)
                .Where(r => r.ReceiverId == userId && r.Status == ConversationRequestStatus.Pending && !r.IsDeleted)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            var requestDtos = requests.Select(r => MapToRequestDto(r)).ToList();
            return Result<List<ConversationRequestDto>>.Success(requestDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending requests");
            return Result<List<ConversationRequestDto>>.Failure("Failed to retrieve requests.");
        }
    }

    public async Task<Result<ConversationRequestDto>> SendConversationRequestAsync(SendConversationRequestRequest request, Guid userId)
    {
        try
        {
            // Check if already blocked
            var isBlocked = await _context.BlockedUsers
                .AnyAsync(b => (b.BlockerId == userId && b.BlockedUserId == request.ReceiverId) ||
                              (b.BlockerId == request.ReceiverId && b.BlockedUserId == userId));

            if (isBlocked)
                return Result<ConversationRequestDto>.Failure("Cannot send request to blocked user.");

            // Check if request already exists (in either direction)
            var existing = await _context.ConversationRequests
                .FirstOrDefaultAsync(r => ((r.RequesterId == userId && r.ReceiverId == request.ReceiverId) ||
                                          (r.RequesterId == request.ReceiverId && r.ReceiverId == userId)) &&
                                        r.Status == ConversationRequestStatus.Pending &&
                                        !r.IsDeleted);

            if (existing != null)
            {
                if (existing.RequesterId == userId)
                    return Result<ConversationRequestDto>.Failure("A pending request already exists.");
                else
                    return Result<ConversationRequestDto>.Failure("A pending request already exists from this user. Please check your pending requests.");
            }
            
            // Check if a conversation already exists between these users
            var existingConversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Type == ConversationType.Direct &&
                                        !c.IsDeleted &&
                                        c.Participants.Any(p => p.UserId == userId && p.IsActive) &&
                                        c.Participants.Any(p => p.UserId == request.ReceiverId && p.IsActive));

            if (existingConversation != null)
                return Result<ConversationRequestDto>.Failure("A conversation already exists between these users.");

            var conversationRequest = new ConversationRequest
            {
                RequesterId = userId,
                ReceiverId = request.ReceiverId,
                Status = ConversationRequestStatus.Pending,
                Message = request.Message?.Trim(),
                RequestedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };

            _context.ConversationRequests.Add(conversationRequest);
            await _context.SaveChangesAsync();

            if (_context is Microsoft.EntityFrameworkCore.DbContext dbContext)
            {
                await dbContext.Entry(conversationRequest).Reference(r => r.Requester).LoadAsync();
            }

            var requestDto = MapToRequestDto(conversationRequest);
            return Result<ConversationRequestDto>.Success(requestDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending conversation request");
            return Result<ConversationRequestDto>.Failure("Failed to send conversation request.");
        }
    }

    public async Task<Result<ConversationDto>> AcceptConversationRequestAsync(Guid requestId, Guid userId)
    {
        try
        {
            var request = await _context.ConversationRequests
                .Include(r => r.Requester)
                .FirstOrDefaultAsync(r => r.Id == requestId && !r.IsDeleted);

            if (request == null)
                return Result<ConversationDto>.Failure("Request not found.");

            if (request.ReceiverId != userId)
                return Result<ConversationDto>.Failure("You are not authorized to accept this request.");

            if (request.Status != ConversationRequestStatus.Pending)
                return Result<ConversationDto>.Failure("Request has already been processed.");

            // Create conversation
            var conversation = new Conversation
            {
                Type = ConversationType.Direct,
                CreatedBy = userId,
            };

            _context.Conversations.Add(conversation);

            _context.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId = request.RequesterId,
                CreatedBy = userId,
            });

            _context.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId = request.ReceiverId,
                CreatedBy = userId,
            });

            // Update request status
            request.Status = ConversationRequestStatus.Accepted;
            request.RespondedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;
            request.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            var dto = await MapToConversationDtoAsync(conversation, userId);
            return Result<ConversationDto>.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting conversation request");
            return Result<ConversationDto>.Failure("Failed to accept conversation request.");
        }
    }

    public async Task<Result> RejectConversationRequestAsync(Guid requestId, Guid userId)
    {
        try
        {
            var request = await _context.ConversationRequests
                .FirstOrDefaultAsync(r => r.Id == requestId && !r.IsDeleted);

            if (request == null)
                return Result.Failure("Request not found.");

            if (request.ReceiverId != userId)
                return Result.Failure("You are not authorized to reject this request.");

            if (request.Status != ConversationRequestStatus.Pending)
                return Result.Failure("Request has already been processed.");

            request.Status = ConversationRequestStatus.Rejected;
            request.RespondedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;
            request.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting conversation request");
            return Result.Failure("Failed to reject conversation request.");
        }
    }

    public async Task<Result> BlockUserAsync(Guid blockedUserId, Guid userId, string? reason = null)
    {
        try
        {
            if (userId == blockedUserId)
                return Result.Failure("Cannot block yourself.");

            var existing = await _context.BlockedUsers
                .FirstOrDefaultAsync(b => b.BlockerId == userId && b.BlockedUserId == blockedUserId && !b.IsDeleted);

            if (existing != null)
                return Result.Success(); // Already blocked

            var blockedUser = new BlockedUser
            {
                BlockerId = userId,
                BlockedUserId = blockedUserId,
                Reason = reason?.Trim(),
                BlockedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };

            _context.BlockedUsers.Add(blockedUser);
            await _context.SaveChangesAsync();

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error blocking user");
            return Result.Failure("Failed to block user.");
        }
    }

    public async Task<Result> UnblockUserAsync(Guid blockedUserId, Guid userId)
    {
        try
        {
            var blocked = await _context.BlockedUsers
                .FirstOrDefaultAsync(b => b.BlockerId == userId && b.BlockedUserId == blockedUserId && !b.IsDeleted);

            if (blocked == null)
                return Result.Failure("User is not blocked.");

            blocked.IsDeleted = true;
            blocked.DeletedAt = DateTime.UtcNow;
            blocked.DeletedBy = userId;
            blocked.UpdatedAt = DateTime.UtcNow;
            blocked.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unblocking user");
            return Result.Failure("Failed to unblock user.");
        }
    }

    public async Task<Result<List<Guid>>> GetBlockedUserIdsAsync(Guid userId)
    {
        try
        {
            var blockedIds = await _context.BlockedUsers
                .Where(b => b.BlockerId == userId && !b.IsDeleted)
                .Select(b => b.BlockedUserId)
                .ToListAsync();

            return Result<List<Guid>>.Success(blockedIds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting blocked user IDs");
            return Result<List<Guid>>.Failure("Failed to retrieve blocked users.");
        }
    }

    public async Task<Result> ReportUserAsync(ReportUserRequest request, Guid userId)
    {
        try
        {
            if (userId == request.UserId)
                return Result.Failure("Cannot report yourself.");

            var report = new ReportedUser
            {
                ReporterId = userId,
                ReportedUserId = request.UserId,
                Reason = request.Reason.Trim(),
                Details = request.Details?.Trim(),
                ReportedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };

            _context.ReportedUsers.Add(report);
            await _context.SaveChangesAsync();

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reporting user");
            return Result.Failure("Failed to report user.");
        }
    }

    public async Task<Result<ConversationDto>> GetOrCreateCourseChatAsync(Guid courseId, Guid userId)
    {
        try
        {
            var course = await _context.Courses
                .Include(c => c.Enrollments)
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);

            if (course == null)
                return Result<ConversationDto>.Failure("Course not found.");

            // Check if user is enrolled or is instructor
            var isEnrolled = course.Enrollments.Any(e => e.UserId == userId && e.Status == EnrollmentStatus.Active);
            var isInstructor = course.InstructorId == userId;

            if (!isEnrolled && !isInstructor)
                return Result<ConversationDto>.Failure("You must be enrolled in the course to access its chat.");

            // Check if course chat already exists
            var existing = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Type == ConversationType.Course &&
                                        c.CourseId == courseId &&
                                        !c.IsDeleted);

            if (existing != null)
            {
                // Ensure user is a participant
                var participant = existing.Participants.FirstOrDefault(p => p.UserId == userId);
                if (participant == null)
                {
                    _context.ConversationParticipants.Add(new ConversationParticipant
                    {
                        ConversationId = existing.Id,
                        UserId = userId,
                        CreatedBy = userId,
                    });
                    await _context.SaveChangesAsync();
                }

                var dto = await MapToConversationDtoAsync(existing, userId);
                return Result<ConversationDto>.Success(dto);
            }

            // Create new course chat
            var conversation = new Conversation
            {
                Type = ConversationType.Course,
                CourseId = courseId,
                Title = $"{course.Title} - Course Chat",
                CreatedBy = userId,
            };

            _context.Conversations.Add(conversation);

            // Add instructor
            _context.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId = course.InstructorId,
                CreatedBy = userId,
            });

            // Add all enrolled students
            var enrolledUserIds = course.Enrollments
                .Where(e => e.Status == EnrollmentStatus.Active)
                .Select(e => e.UserId)
                .Distinct()
                .ToList();

            foreach (var enrolledUserId in enrolledUserIds)
            {
                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationId = conversation.Id,
                    UserId = enrolledUserId,
                    CreatedBy = userId,
                });
            }

            await _context.SaveChangesAsync();

            var conversationDto = await MapToConversationDtoAsync(conversation, userId);
            return Result<ConversationDto>.Success(conversationDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting or creating course chat");
            return Result<ConversationDto>.Failure("Failed to get or create course chat.");
        }
    }

    // Helper methods
    private ConversationDto MapToConversationDto(Conversation conversation, Guid userId, int unreadCount, ConversationMessage? lastMessage)
    {
        var participants = conversation.Participants
            .Where(p => p.IsActive)
            .Select(p => MapToParticipantDto(p))
            .ToList();

        var otherParticipant = conversation.Type == ConversationType.Direct
            ? participants.FirstOrDefault(p => p.UserId != userId)
            : null;

        return new ConversationDto
        {
            Id = conversation.Id,
            Type = conversation.Type.ToString(),
            CourseId = conversation.CourseId,
            CourseTitle = conversation.Course?.Title,
            Title = conversation.Title,
            LastMessageAt = conversation.LastMessageAt,
            UnreadCount = unreadCount,
            LastMessage = lastMessage != null ? MapToMessageDto(lastMessage) : null,
            Participants = participants,
            OtherParticipant = otherParticipant,
        };
    }

    private async Task<ConversationDto> MapToConversationDtoAsync(Conversation conversation, Guid userId)
    {
        if (_context is Microsoft.EntityFrameworkCore.DbContext dbContext)
        {
            await dbContext.Entry(conversation).Collection(c => c.Participants).Query()
                .Include(p => p.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .LoadAsync();

            await dbContext.Entry(conversation).Reference(c => c.Course).LoadAsync();
        }

        var participant = conversation.Participants.FirstOrDefault(p => p.UserId == userId);
        var unreadCount = participant != null
            ? await _context.ConversationMessages
                .CountAsync(m => m.ConversationId == conversation.Id &&
                               m.SenderId != userId &&
                               (participant.LastReadAt == null || m.SentAt > participant.LastReadAt) &&
                               !m.IsDeleted)
            : 0;

        var lastMessage = await _context.ConversationMessages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversation.Id && !m.IsDeleted)
            .OrderByDescending(m => m.SentAt)
            .FirstOrDefaultAsync();

        return MapToConversationDto(conversation, userId, unreadCount, lastMessage);
    }

    private ConversationParticipantDto MapToParticipantDto(ConversationParticipant participant)
    {
        var user = participant.User;
        var isInstructor = user.UserRoles != null && user.UserRoles
            .Where(ur => !ur.IsDeleted && ur.Role != null && !ur.Role.IsDeleted)
            .Any(ur =>
            {
                var n = ur.Role!.Name;
                return string.Equals(n, "Instructor", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(n, "Admin", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(n, "SuperAdmin", StringComparison.OrdinalIgnoreCase);
            });

        return new ConversationParticipantDto
        {
            Id = participant.Id,
            UserId = participant.UserId,
            UserName = user.FullName,
            UserEmail = user.Email,
            ProfilePictureUrl = user.ProfilePictureUrl,
            IsInstructor = isInstructor,
            JoinedAt = participant.JoinedAt,
            LastReadAt = participant.LastReadAt,
        };
    }

    private ConversationMessageDto MapToMessageDto(ConversationMessage message)
    {
        return new ConversationMessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = message.Sender.FullName,
            SenderProfilePictureUrl = message.Sender.ProfilePictureUrl,
            SenderIsStaff = SenderIsPlatformStaff(message.Sender),
            Content = message.Content,
            SentAt = message.SentAt,
            EditedAt = message.EditedAt,
            IsDeleted = message.IsDeleted,
        };
    }

    /// <summary>
    /// User may open a direct chat without the student-to-student approval flow (staff or instructor).
    /// </summary>
    private static bool UserCanOpenDirectChat(User? user)
    {
        if (user?.UserRoles == null || user.UserRoles.Count == 0)
            return false;
        return user.UserRoles
            .Where(ur => !ur.IsDeleted && ur.Role != null && !ur.Role.IsDeleted)
            .Any(ur =>
            {
                var n = ur.Role!.Name;
                return string.Equals(n, "Instructor", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(n, "Admin", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(n, "SuperAdmin", StringComparison.OrdinalIgnoreCase);
            });
    }

    private static bool SenderIsPlatformStaff(User sender)
    {
        if (sender.UserRoles == null || sender.UserRoles.Count == 0)
            return false;
        return sender.UserRoles
            .Where(ur => !ur.IsDeleted && ur.Role != null && !ur.Role.IsDeleted)
            .Any(ur =>
            {
                var n = ur.Role!.Name;
                return string.Equals(n, "Admin", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(n, "SuperAdmin", StringComparison.OrdinalIgnoreCase);
            });
    }

    private ConversationRequestDto MapToRequestDto(ConversationRequest request)
    {
        return new ConversationRequestDto
        {
            Id = request.Id,
            RequesterId = request.RequesterId,
            RequesterName = request.Requester.FullName,
            RequesterEmail = request.Requester.Email,
            RequesterProfilePictureUrl = request.Requester.ProfilePictureUrl,
            ReceiverId = request.ReceiverId,
            Status = request.Status.ToString(),
            Message = request.Message,
            RequestedAt = request.RequestedAt,
            RespondedAt = request.RespondedAt,
        };
    }
}


