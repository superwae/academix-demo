using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Enrollment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ILogger<EnrollmentService> _logger;

    public EnrollmentService(
        IApplicationDbContext context,
        INotificationService notificationService,
        ILogger<EnrollmentService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<Result<EnrollmentDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .Include(e => e.Section)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, cancellationToken);

        if (enrollment == null)
        {
            return Result<EnrollmentDto>.Failure("Enrollment not found.");
        }

        var enrollmentDto = MapToEnrollmentDto(enrollment);
        return Result<EnrollmentDto>.Success(enrollmentDto);
    }

    public async Task<Result<PagedResult<EnrollmentDto>>> GetByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Enrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .Include(e => e.Section)
            .Where(e => e.UserId == userId && !e.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(e =>
                e.Course.Title.ToLower().Contains(searchTerm) ||
                e.Section.Name.ToLower().Contains(searchTerm));
        }

        // Status filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            // Could add status filtering here if needed
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "course" => request.SortDescending
                ? query.OrderByDescending(e => e.Course.Title)
                : query.OrderBy(e => e.Course.Title),
            "enrolled" => request.SortDescending
                ? query.OrderByDescending(e => e.EnrolledAt)
                : query.OrderBy(e => e.EnrolledAt),
            "status" => request.SortDescending
                ? query.OrderByDescending(e => e.Status)
                : query.OrderBy(e => e.Status),
            _ => query.OrderByDescending(e => e.EnrolledAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var enrollments = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var enrollmentDtos = enrollments.Select(MapToEnrollmentDto).ToList();

        return Result<PagedResult<EnrollmentDto>>.Success(new PagedResult<EnrollmentDto>
        {
            Items = enrollmentDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<PagedResult<EnrollmentDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Enrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .Include(e => e.Section)
            .Where(e => e.CourseId == courseId && !e.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(e =>
                e.User.FirstName.ToLower().Contains(searchTerm) ||
                e.User.LastName.ToLower().Contains(searchTerm) ||
                e.User.Email.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "user" => request.SortDescending
                ? query.OrderByDescending(e => e.User.LastName).ThenByDescending(e => e.User.FirstName)
                : query.OrderBy(e => e.User.LastName).ThenBy(e => e.User.FirstName),
            "enrolled" => request.SortDescending
                ? query.OrderByDescending(e => e.EnrolledAt)
                : query.OrderBy(e => e.EnrolledAt),
            "status" => request.SortDescending
                ? query.OrderByDescending(e => e.Status)
                : query.OrderBy(e => e.Status),
            _ => query.OrderByDescending(e => e.EnrolledAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var enrollments = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var enrollmentDtos = enrollments.Select(MapToEnrollmentDto).ToList();

        return Result<PagedResult<EnrollmentDto>>.Success(new PagedResult<EnrollmentDto>
        {
            Items = enrollmentDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<EnrollmentDto>> EnrollAsync(CreateEnrollmentRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Use a transaction to prevent race conditions
        var dbContext = _context as DbContext ?? throw new InvalidOperationException("Context must be a DbContext");
        using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Business Rule 1: Validate user exists and is not suspended
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

            if (user == null)
            {
                return Result<EnrollmentDto>.Failure("User not found.");
            }

            if (!user.IsActive)
            {
                return Result<EnrollmentDto>.Failure("Cannot enroll: User account is suspended.");
            }

            // Business Rule 2: Validate course exists and is Published
            var course = await _context.Courses
                .Include(c => c.Sections)
                .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);

            if (course == null)
            {
                return Result<EnrollmentDto>.Failure("Course not found.");
            }

            if (course.Status != CourseStatus.Published)
            {
                return Result<EnrollmentDto>.Failure("Cannot enroll: Course is not published.");
            }

            // Business Rule 3: Course must not be Archived
            if (course.Status == CourseStatus.Archived)
            {
                return Result<EnrollmentDto>.Failure("Cannot enroll: Course is archived.");
            }

            // Business Rule 4: Validate section exists and belongs to course
            var section = await _context.CourseSections
                .FirstOrDefaultAsync(s => s.Id == request.SectionId && s.CourseId == request.CourseId && !s.IsDeleted, cancellationToken);

            if (section == null)
            {
                return Result<EnrollmentDto>.Failure("Section not found or does not belong to this course.");
            }

            if (!section.IsActive)
            {
                return Result<EnrollmentDto>.Failure("Cannot enroll: Section is not active.");
            }

            // Business Rule 5: Prevent duplicate enrollment in the same section
            // Check within transaction to prevent race conditions
            var existingEnrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e =>
                    e.UserId == userId &&
                    e.CourseId == request.CourseId &&
                    e.SectionId == request.SectionId &&
                    !e.IsDeleted &&
                    (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                    cancellationToken);

            if (existingEnrollment != null)
            {
                return Result<EnrollmentDto>.Failure("You are already enrolled in this course section.");
            }

            // Business Rule 5b: Prevent enrolling in multiple sections of the same course
            // CRITICAL: This prevents the same student from enrolling in multiple sections
            var existingCourseEnrollment = await _context.Enrollments
                .Include(e => e.Section)
                .FirstOrDefaultAsync(e =>
                    e.UserId == userId &&
                    e.CourseId == request.CourseId &&
                    !e.IsDeleted &&
                    (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                    cancellationToken);

            if (existingCourseEnrollment != null)
            {
                return Result<EnrollmentDto>.Failure($"You are already enrolled in this course (Section: {existingCourseEnrollment.Section.Name}). You can only enroll in one section per course. Please unenroll from your current section first if you want to switch.");
            }

            // Business Rule 6: Check available seats in Section
            if (section.MaxSeats > 0)
            {
                var activeEnrollmentsCount = await _context.Enrollments
                    .CountAsync(e =>
                        e.SectionId == request.SectionId &&
                        !e.IsDeleted &&
                        (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                        cancellationToken);

                if (activeEnrollmentsCount >= section.MaxSeats)
                {
                    return Result<EnrollmentDto>.Failure("Cannot enroll: Section is full.");
                }
            }

            // Create enrollment
            var enrollment = new Enrollment
            {
                UserId = userId,
                CourseId = request.CourseId,
                SectionId = request.SectionId,
                EnrolledAt = DateTime.UtcNow,
                Status = EnrollmentStatus.Active,
                ProgressPercentage = 0
            };

            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync(cancellationToken);

            // Update section seats remaining
            if (section.MaxSeats > 0)
            {
                var activeEnrollmentsCount = await _context.Enrollments
                    .CountAsync(e =>
                        e.SectionId == request.SectionId &&
                        !e.IsDeleted &&
                        (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                        cancellationToken);

                section.SeatsRemaining = Math.Max(0, section.MaxSeats - activeEnrollmentsCount);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // Commit transaction
            await transaction.CommitAsync(cancellationToken);

            await SendEnrollmentNotificationsAsync(
                user,
                course,
                section,
                enrollment.Id,
                userId,
                cancellationToken);

            // Reload with relations
            var createdEnrollment = await _context.Enrollments
                .Include(e => e.User)
                .Include(e => e.Course)
                .Include(e => e.Section)
                .FirstAsync(e => e.Id == enrollment.Id, cancellationToken);

            _logger.LogInformation("User {UserId} enrolled in course {CourseId}, section {SectionId}", userId, request.CourseId, request.SectionId);

            var enrollmentDto = MapToEnrollmentDto(createdEnrollment);
            return Result<EnrollmentDto>.Success(enrollmentDto);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message?.Contains("duplicate") == true || 
                                            ex.InnerException?.Message?.Contains("unique") == true)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogWarning(ex, "Duplicate enrollment attempt prevented by database constraint for user {UserId}, course {CourseId}", userId, request.CourseId);
            return Result<EnrollmentDto>.Failure("You are already enrolled in this course. Please check your enrollments.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Error enrolling user {UserId} in course {CourseId}, section {SectionId}", userId, request.CourseId, request.SectionId);
            throw;
        }
    }

    public async Task<Result> UnenrollAsync(Guid enrollmentId, Guid userId, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        // Use a transaction to ensure data consistency
        var dbContext = _context as DbContext ?? throw new InvalidOperationException("Context must be a DbContext");
        using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var enrollment = await _context.Enrollments
                .Include(e => e.Section)
                .FirstOrDefaultAsync(e => e.Id == enrollmentId && !e.IsDeleted, cancellationToken);

            if (enrollment == null)
            {
                return Result.Failure("Enrollment not found.");
            }

            // Ownership check: User can only unenroll themselves (unless Admin)
            if (!isAdmin && enrollment.UserId != userId)
            {
                return Result.Failure("You can only unenroll from your own enrollments.");
            }

            // Only allow unenrolling from Active or Completed enrollments
            // Cannot unenroll from already Cancelled, Dropped, or Suspended enrollments
            if (enrollment.Status != EnrollmentStatus.Active && enrollment.Status != EnrollmentStatus.Completed)
            {
                return Result.Failure($"Cannot unenroll: Enrollment status is {enrollment.Status}. Only Active or Completed enrollments can be unenrolled.");
            }

            // Soft delete / Cancel enrollment - change status to Cancelled and mark as deleted
            // This allows the user to re-enroll in the same course/section later
            enrollment.Status = EnrollmentStatus.Cancelled;
            enrollment.IsDeleted = true; // Soft delete to allow re-enrollment
            enrollment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            // Update section seats remaining
            if (enrollment.Section.MaxSeats > 0)
            {
                var activeEnrollmentsCount = await _context.Enrollments
                    .CountAsync(e =>
                        e.SectionId == enrollment.SectionId &&
                        !e.IsDeleted &&
                        (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                        cancellationToken);

                enrollment.Section.SeatsRemaining = Math.Max(0, enrollment.Section.MaxSeats - activeEnrollmentsCount);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // Commit transaction
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation("User {UserId} unenrolled from enrollment {EnrollmentId}", userId, enrollmentId);
            return Result.Success();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Error unenrolling user {UserId} from enrollment {EnrollmentId}", userId, enrollmentId);
            return Result.Failure($"An error occurred while unenrolling: {ex.Message}");
        }
    }

    public async Task<Result<EnrollmentDto>> UpdateAsync(Guid id, UpdateEnrollmentRequest request, CancellationToken cancellationToken = default)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .Include(e => e.Section)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, cancellationToken);

        if (enrollment == null)
        {
            return Result<EnrollmentDto>.Failure("Enrollment not found.");
        }

        // Update status if provided
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (Enum.TryParse<EnrollmentStatus>(request.Status, true, out var status))
            {
                enrollment.Status = status;
            }
            else
            {
                return Result<EnrollmentDto>.Failure("Invalid enrollment status.");
            }
        }

        // Update progress if provided
        if (request.ProgressPercentage.HasValue)
        {
            var progress = request.ProgressPercentage.Value;
            if (progress < 0 || progress > 100)
            {
                return Result<EnrollmentDto>.Failure("Progress percentage must be between 0 and 100.");
            }
            enrollment.ProgressPercentage = progress;
        }

        enrollment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Reload
        var updatedEnrollment = await _context.Enrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .Include(e => e.Section)
            .FirstAsync(e => e.Id == enrollment.Id, cancellationToken);

        var enrollmentDto = MapToEnrollmentDto(updatedEnrollment);
        return Result<EnrollmentDto>.Success(enrollmentDto);
    }

    public async Task<Result> UpdateProgressAsync(Guid enrollmentId, decimal progressPercentage, CancellationToken cancellationToken = default)
    {
        if (progressPercentage < 0 || progressPercentage > 100)
        {
            return Result.Failure("Progress percentage must be between 0 and 100.");
        }

        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.Id == enrollmentId && !e.IsDeleted, cancellationToken);

        if (enrollment == null)
        {
            return Result.Failure("Enrollment not found.");
        }

        enrollment.ProgressPercentage = progressPercentage;
        enrollment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> CompleteAsync(Guid enrollmentId, CancellationToken cancellationToken = default)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.Id == enrollmentId && !e.IsDeleted, cancellationToken);

        if (enrollment == null)
        {
            return Result.Failure("Enrollment not found.");
        }

        if (enrollment.Status != EnrollmentStatus.Active)
        {
            return Result.Failure($"Cannot complete enrollment: Current status is {enrollment.Status}.");
        }

        enrollment.Status = EnrollmentStatus.Completed;
        enrollment.ProgressPercentage = 100;
        enrollment.CompletedAt = DateTime.UtcNow;
        enrollment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Enrollment {EnrollmentId} marked as completed", enrollmentId);

        return Result.Success();
    }

    public async Task<Result<bool>> CheckConflictAsync(Guid userId, Guid courseId, Guid sectionId, CancellationToken cancellationToken = default)
    {
        var existingEnrollment = await _context.Enrollments
            .AnyAsync(e =>
                e.UserId == userId &&
                e.CourseId == courseId &&
                e.SectionId == sectionId &&
                !e.IsDeleted &&
                (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed),
                cancellationToken);

        return Result<bool>.Success(existingEnrollment);
    }

    public async Task<Result<bool>> VerifyCourseInstructorAsync(Guid courseId, Guid userId, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<bool>.Failure("Course not found.");
        }

        return Result<bool>.Success(course.InstructorId == userId);
    }

    /// <summary>
    /// Notifies the course instructor and the enrolling student. Failures are logged only — enrollment already succeeded.
    /// </summary>
    private async Task SendEnrollmentNotificationsAsync(
        User student,
        Course course,
        CourseSection section,
        Guid enrollmentId,
        Guid studentUserId,
        CancellationToken cancellationToken)
    {
        try
        {
            var studentName = $"{student.FirstName} {student.LastName}".Trim();
            if (string.IsNullOrEmpty(studentName))
                studentName = student.Email ?? "A student";

            var instructorNotify = await _notificationService.CreateAsync(
                course.InstructorId,
                "enrollment",
                "New student enrollment",
                $"{studentName} enrolled in {course.Title} ({section.Name}).",
                $"/teacher/courses/{course.Id}/students",
                data: $"{{\"enrollmentId\":\"{enrollmentId}\",\"courseId\":\"{course.Id}\"}}",
                cancellationToken: cancellationToken);

            if (!instructorNotify.IsSuccess)
                _logger.LogWarning("Could not notify instructor {InstructorId}: {Error}", course.InstructorId, instructorNotify.Error);

            var studentNotify = await _notificationService.CreateAsync(
                studentUserId,
                "enrollment",
                $"Welcome to {course.Title}",
                $"You're enrolled in {section.Name}. Open your course to start learning.",
                $"/student/my-classes/{course.Id}/lessons",
                data: $"{{\"enrollmentId\":\"{enrollmentId}\",\"courseId\":\"{course.Id}\"}}",
                cancellationToken: cancellationToken);

            if (!studentNotify.IsSuccess)
                _logger.LogWarning("Could not notify student {StudentId}: {Error}", studentUserId, studentNotify.Error);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send enrollment notifications for enrollment {EnrollmentId}", enrollmentId);
        }
    }

    private static EnrollmentDto MapToEnrollmentDto(Enrollment enrollment)
    {
        return new EnrollmentDto
        {
            Id = enrollment.Id,
            UserId = enrollment.UserId,
            UserName = enrollment.User?.FullName ?? string.Empty,
            UserEmail = enrollment.User?.Email ?? string.Empty,
            CourseId = enrollment.CourseId,
            CourseTitle = enrollment.Course?.Title ?? string.Empty,
            SectionId = enrollment.SectionId,
            SectionName = enrollment.Section?.Name ?? string.Empty,
            EnrolledAt = enrollment.EnrolledAt,
            Status = enrollment.Status.ToString(),
            ProgressPercentage = enrollment.ProgressPercentage,
            CompletedAt = enrollment.CompletedAt
        };
    }
}

