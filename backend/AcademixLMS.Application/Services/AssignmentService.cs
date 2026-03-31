using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Assignment;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class AssignmentService : IAssignmentService
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ILogger<AssignmentService> _logger;

    public AssignmentService(
        IApplicationDbContext context,
        INotificationService notificationService,
        ILogger<AssignmentService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<Result<AssignmentDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Course)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

        if (assignment == null)
        {
            return Result<AssignmentDto>.Failure("Assignment not found.");
        }

        var assignmentDto = MapToAssignmentDto(assignment);
        return Result<AssignmentDto>.Success(assignmentDto);
    }

    public async Task<Result<PagedResult<AssignmentDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Assignments
            .Include(a => a.Course)
            .Where(a => a.CourseId == courseId && !a.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(a =>
                a.Title.ToLower().Contains(searchTerm) ||
                a.Prompt.ToLower().Contains(searchTerm));
        }

        // Status filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            // Could add status filtering here if needed
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "title" => request.SortDescending
                ? query.OrderByDescending(a => a.Title)
                : query.OrderBy(a => a.Title),
            "due" => request.SortDescending
                ? query.OrderByDescending(a => a.DueAt)
                : query.OrderBy(a => a.DueAt),
            "status" => request.SortDescending
                ? query.OrderByDescending(a => a.Status)
                : query.OrderBy(a => a.Status),
            _ => query.OrderBy(a => a.DueAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var assignments = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var assignmentDtos = assignments.Select(MapToAssignmentDto).ToList();

        return Result<PagedResult<AssignmentDto>>.Success(new PagedResult<AssignmentDto>
        {
            Items = assignmentDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<PagedResult<AssignmentDto>>> GetByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        // Get assignments for courses the user is enrolled in
        var enrolledCourseIds = await _context.Enrollments
            .Where(e => e.UserId == userId && !e.IsDeleted && e.Status == EnrollmentStatus.Active)
            .Select(e => e.CourseId)
            .ToListAsync(cancellationToken);

        var query = _context.Assignments
            .Include(a => a.Course)
            .Where(a => enrolledCourseIds.Contains(a.CourseId) && !a.IsDeleted && a.Status == AssignmentStatus.Published)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(a =>
                a.Title.ToLower().Contains(searchTerm) ||
                a.Prompt.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "title" => request.SortDescending
                ? query.OrderByDescending(a => a.Title)
                : query.OrderBy(a => a.Title),
            "due" => request.SortDescending
                ? query.OrderByDescending(a => a.DueAt)
                : query.OrderBy(a => a.DueAt),
            _ => query.OrderBy(a => a.DueAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var assignments = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var assignmentDtos = assignments.Select(MapToAssignmentDto).ToList();

        return Result<PagedResult<AssignmentDto>>.Success(new PagedResult<AssignmentDto>
        {
            Items = assignmentDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<AssignmentDto>> CreateAsync(CreateAssignmentRequest request, CancellationToken cancellationToken = default)
    {
        // Validate course exists
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<AssignmentDto>.Failure("Course not found.");
        }

        // Validate MaxScore
        if (request.MaxScore <= 0)
        {
            return Result<AssignmentDto>.Failure("MaxScore must be greater than 0.");
        }

        var status = AssignmentStatus.Draft;
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<AssignmentStatus>(request.Status, true, out var parsedStatus))
        {
            status = parsedStatus;
        }

        // Create assignment
        var assignment = new Assignment
        {
            CourseId = request.CourseId,
            Title = request.Title,
            Prompt = request.Prompt,
            DueAt = request.DueAt,
            MaxScore = request.MaxScore,
            Weight = request.Weight,
            AllowLateSubmission = request.AllowLateSubmission,
            LatePenaltyPercent = request.LatePenaltyPercent,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

        _context.Assignments.Add(assignment);
        await _context.SaveChangesAsync(cancellationToken);

        // Reload with relations
        var createdAssignment = await _context.Assignments
            .Include(a => a.Course)
            .FirstAsync(a => a.Id == assignment.Id, cancellationToken);

        _logger.LogInformation("Assignment {AssignmentId} created for course {CourseId}", assignment.Id, request.CourseId);

        var assignmentDto = MapToAssignmentDto(createdAssignment);
        return Result<AssignmentDto>.Success(assignmentDto);
    }

    public async Task<Result<AssignmentDto>> UpdateAsync(Guid id, UpdateAssignmentRequest request, CancellationToken cancellationToken = default)
    {
        var assignment = await _context.Assignments
            .Include(a => a.Course)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

        if (assignment == null)
        {
            return Result<AssignmentDto>.Failure("Assignment not found.");
        }

        // Update fields if provided
        if (!string.IsNullOrWhiteSpace(request.Title))
            assignment.Title = request.Title;

        if (!string.IsNullOrWhiteSpace(request.Prompt))
            assignment.Prompt = request.Prompt;

        if (request.DueAt.HasValue)
            assignment.DueAt = request.DueAt.Value;

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (Enum.TryParse<AssignmentStatus>(request.Status, true, out var status))
            {
                assignment.Status = status;
            }
            else
            {
                return Result<AssignmentDto>.Failure("Invalid assignment status.");
            }
        }

        if (request.MaxScore.HasValue)
        {
            if (request.MaxScore.Value <= 0)
            {
                return Result<AssignmentDto>.Failure("MaxScore must be greater than 0.");
            }
            assignment.MaxScore = request.MaxScore.Value;
        }

        if (request.Weight.HasValue)
            assignment.Weight = request.Weight.Value;

        if (request.AllowLateSubmission.HasValue)
            assignment.AllowLateSubmission = request.AllowLateSubmission.Value;

        if (request.LatePenaltyPercent.HasValue)
            assignment.LatePenaltyPercent = request.LatePenaltyPercent.Value;

        assignment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Reload
        var updatedAssignment = await _context.Assignments
            .Include(a => a.Course)
            .FirstAsync(a => a.Id == assignment.Id, cancellationToken);

        var assignmentDto = MapToAssignmentDto(updatedAssignment);
        return Result<AssignmentDto>.Success(assignmentDto);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var assignment = await _context.Assignments
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

        if (assignment == null)
        {
            return Result.Failure("Assignment not found.");
        }

        // Check if assignment has submissions
        var hasSubmissions = await _context.AssignmentSubmissions
            .AnyAsync(s => s.AssignmentId == id && !s.IsDeleted, cancellationToken);

        if (hasSubmissions)
        {
            return Result.Failure("Cannot delete assignment with submissions. Close it instead.");
        }

        // Soft delete
        assignment.IsDeleted = true;
        assignment.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Assignment {AssignmentId} deleted", id);

        return Result.Success();
    }

    public async Task<Result<AssignmentSubmissionDto>> GetSubmissionAsync(Guid assignmentId, Guid userId, CancellationToken cancellationToken = default)
    {
        var submission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Course)
            .Include(s => s.User)
            .Include(s => s.Grader)
            .FirstOrDefaultAsync(s =>
                s.AssignmentId == assignmentId &&
                s.UserId == userId &&
                !s.IsDeleted,
                cancellationToken);

        if (submission == null)
        {
            return Result<AssignmentSubmissionDto>.Failure("Submission not found.");
        }

        var submissionDto = MapToSubmissionDto(submission);
        return Result<AssignmentSubmissionDto>.Success(submissionDto);
    }

    public async Task<Result<AssignmentSubmissionDto>> SubmitAsync(Guid assignmentId, SubmitAssignmentRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Validate assignment exists and is published
        var assignment = await _context.Assignments
            .Include(a => a.Course)
            .FirstOrDefaultAsync(a => a.Id == assignmentId && !a.IsDeleted, cancellationToken);

        if (assignment == null)
        {
            return Result<AssignmentSubmissionDto>.Failure("Assignment not found.");
        }

        if (assignment.Status != AssignmentStatus.Published)
        {
            return Result<AssignmentSubmissionDto>.Failure("Assignment is not available for submission.");
        }

        // Check if assignment is closed
        if (assignment.Status == AssignmentStatus.Closed)
        {
            return Result<AssignmentSubmissionDto>.Failure("Assignment is closed. No more submissions accepted.");
        }

        // Validate user is enrolled in the course
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e =>
                e.UserId == userId &&
                e.CourseId == assignment.CourseId &&
                !e.IsDeleted &&
                e.Status == EnrollmentStatus.Active,
                cancellationToken);

        if (enrollment == null)
        {
            return Result<AssignmentSubmissionDto>.Failure("You must be enrolled in the course to submit assignments.");
        }

        // Check for late submission
        var isLate = DateTime.UtcNow > assignment.DueAt;
        if (isLate && !assignment.AllowLateSubmission)
        {
            return Result<AssignmentSubmissionDto>.Failure("Assignment deadline has passed and late submissions are not allowed.");
        }

        // Check if user already submitted (allow resubmission if not graded)
        var existingSubmission = await _context.AssignmentSubmissions
            .FirstOrDefaultAsync(s =>
                s.AssignmentId == assignmentId &&
                s.UserId == userId &&
                !s.IsDeleted,
                cancellationToken);

        if (existingSubmission != null)
        {
            // Allow resubmission if not graded
            if (existingSubmission.GradedAt.HasValue)
            {
                return Result<AssignmentSubmissionDto>.Failure("Cannot resubmit: Assignment has already been graded.");
            }

            // Update existing submission
            existingSubmission.Text = request.Text;
            existingSubmission.FileName = request.FileName;
            existingSubmission.FileSize = request.FileSize;
            existingSubmission.FileUrl = request.FileUrl;
            existingSubmission.SubmittedAt = DateTime.UtcNow;
            existingSubmission.IsLate = isLate;
            existingSubmission.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            // Reload
            var updatedSubmission = await _context.AssignmentSubmissions
                .Include(s => s.Assignment)
                    .ThenInclude(a => a.Course)
                .Include(s => s.User)
                .Include(s => s.Grader)
                .FirstAsync(s => s.Id == existingSubmission.Id, cancellationToken);

            _logger.LogInformation("User {UserId} resubmitted assignment {AssignmentId}", userId, assignmentId);

            await NotifyInstructorAssignmentSubmittedAsync(updatedSubmission, isResubmission: true, cancellationToken);

            var submissionDto = MapToSubmissionDto(updatedSubmission);
            return Result<AssignmentSubmissionDto>.Success(submissionDto);
        }

        // Create new submission
        var submission = new AssignmentSubmission
        {
            AssignmentId = assignmentId,
            UserId = userId,
            Text = request.Text,
            FileName = request.FileName,
            FileSize = request.FileSize,
            FileUrl = request.FileUrl,
            SubmittedAt = DateTime.UtcNow,
            IsLate = isLate,
            CreatedAt = DateTime.UtcNow
        };

        _context.AssignmentSubmissions.Add(submission);
        await _context.SaveChangesAsync(cancellationToken);

        // Reload with relations
        var createdSubmission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Course)
            .Include(s => s.User)
            .Include(s => s.Grader)
            .FirstAsync(s => s.Id == submission.Id, cancellationToken);

        _logger.LogInformation("User {UserId} submitted assignment {AssignmentId}", userId, assignmentId);

        await NotifyInstructorAssignmentSubmittedAsync(createdSubmission, isResubmission: false, cancellationToken);

        var submissionDto2 = MapToSubmissionDto(createdSubmission);
        return Result<AssignmentSubmissionDto>.Success(submissionDto2);
    }

    public async Task<Result<AssignmentSubmissionDto>> GradeSubmissionAsync(Guid submissionId, GradeSubmissionRequest request, Guid gradedBy, CancellationToken cancellationToken = default)
    {
        var submission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Course)
            .Include(s => s.User)
            .Include(s => s.Grader)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted, cancellationToken);

        if (submission == null)
        {
            return Result<AssignmentSubmissionDto>.Failure("Submission not found.");
        }

        // Validate score
        if (request.Score < 0 || request.Score > submission.Assignment.MaxScore)
        {
            return Result<AssignmentSubmissionDto>.Failure($"Score must be between 0 and {submission.Assignment.MaxScore}.");
        }

        // Instructor-entered raw score; Score stores the final grade after at most one late penalty application.
        submission.InstructorScore = request.Score;

        decimal finalScore = request.Score;
        if (submission.IsLate && submission.Assignment.LatePenaltyPercent.HasValue)
        {
            var penalty = request.Score * (submission.Assignment.LatePenaltyPercent.Value / 100m);
            finalScore = Math.Max(0, request.Score - penalty);
        }

        submission.Score = finalScore;
        submission.Feedback = request.Feedback;
        submission.GradedAt = DateTime.UtcNow;
        submission.GradedBy = gradedBy;
        submission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Reload
        var gradedSubmission = await _context.AssignmentSubmissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Course)
            .Include(s => s.User)
            .Include(s => s.Grader)
            .FirstAsync(s => s.Id == submission.Id, cancellationToken);

        _logger.LogInformation("Submission {SubmissionId} graded by {GradedBy} with score {Score}", submissionId, gradedBy, finalScore);

        try
        {
            var assignment = gradedSubmission.Assignment;
            var assignmentTitle = assignment?.Title ?? "Assignment";
            var courseTitle = assignment?.Course?.Title ?? "Course";
            var maxScore = assignment?.MaxScore ?? 0;
            var link = "/student/assignments";
            var data =
                $"{{\"submissionId\":\"{gradedSubmission.Id}\",\"assignmentId\":\"{assignment?.Id}\"}}";
            var msg =
                $"Your submission for \"{assignmentTitle}\" ({courseTitle}) was graded. Score: {finalScore}/{maxScore}.";
            var notifyResult = await _notificationService.CreateAsync(
                gradedSubmission.UserId,
                "grade",
                "Assignment graded",
                msg,
                link,
                data,
                null,
                cancellationToken);
            if (!notifyResult.IsSuccess)
                _logger.LogWarning("Could not notify student {UserId} about graded submission: {Error}", gradedSubmission.UserId, notifyResult.Error);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create grade notification for submission {SubmissionId}", submissionId);
        }

        var submissionDto = MapToSubmissionDto(gradedSubmission);
        return Result<AssignmentSubmissionDto>.Success(submissionDto);
    }

    public async Task<Result<PagedResult<AssignmentSubmissionDto>>> GetSubmissionsAsync(Guid assignmentId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.AssignmentSubmissions
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Course)
            .Include(s => s.User)
            .Include(s => s.Grader)
            .Where(s => s.AssignmentId == assignmentId && !s.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(s =>
                s.User.FirstName.ToLower().Contains(searchTerm) ||
                s.User.LastName.ToLower().Contains(searchTerm) ||
                s.User.Email.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "user" => request.SortDescending
                ? query.OrderByDescending(s => s.User.LastName).ThenByDescending(s => s.User.FirstName)
                : query.OrderBy(s => s.User.LastName).ThenBy(s => s.User.FirstName),
            "submitted" => request.SortDescending
                ? query.OrderByDescending(s => s.SubmittedAt)
                : query.OrderBy(s => s.SubmittedAt),
            "score" => request.SortDescending
                ? query.OrderByDescending(s => s.Score ?? 0)
                : query.OrderBy(s => s.Score ?? 0),
            _ => query.OrderByDescending(s => s.SubmittedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var submissions = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var submissionDtos = submissions.Select(MapToSubmissionDto).ToList();

        return Result<PagedResult<AssignmentSubmissionDto>>.Success(new PagedResult<AssignmentSubmissionDto>
        {
            Items = submissionDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    private static AssignmentDto MapToAssignmentDto(Assignment assignment)
    {
        return new AssignmentDto
        {
            Id = assignment.Id,
            CourseId = assignment.CourseId,
            CourseTitle = assignment.Course?.Title ?? string.Empty,
            Title = assignment.Title,
            Prompt = assignment.Prompt,
            DueAt = assignment.DueAt,
            Status = assignment.Status.ToString(),
            MaxScore = assignment.MaxScore,
            Weight = assignment.Weight,
            AllowLateSubmission = assignment.AllowLateSubmission,
            LatePenaltyPercent = assignment.LatePenaltyPercent,
            CreatedAt = assignment.CreatedAt
        };
    }

    private static AssignmentSubmissionDto MapToSubmissionDto(AssignmentSubmission submission)
    {
        return new AssignmentSubmissionDto
        {
            Id = submission.Id,
            AssignmentId = submission.AssignmentId,
            AssignmentTitle = submission.Assignment?.Title ?? string.Empty,
            UserId = submission.UserId,
            UserName = submission.User?.FullName ?? string.Empty,
            Text = submission.Text,
            FileName = submission.FileName,
            FileSize = submission.FileSize,
            FileUrl = submission.FileUrl,
            SubmittedAt = submission.SubmittedAt,
            GradedAt = submission.GradedAt,
            GradedBy = submission.GradedBy,
            GraderName = submission.Grader?.FullName,
            InstructorScore = ResolveInstructorScoreForDto(submission),
            Score = submission.Score,
            Feedback = submission.Feedback,
            IsLate = submission.IsLate
        };
    }

    private async Task NotifyInstructorAssignmentSubmittedAsync(
        AssignmentSubmission submission,
        bool isResubmission,
        CancellationToken cancellationToken)
    {
        try
        {
            var course = submission.Assignment?.Course;
            var instructorId = course?.InstructorId;
            if (!instructorId.HasValue || instructorId.Value == submission.UserId)
                return;

            var student = submission.User;
            var studentName = student != null
                ? (string.IsNullOrWhiteSpace(student.FullName) ? student.Email : student.FullName.Trim())
                : "A student";

            var assignmentTitle = submission.Assignment?.Title ?? "Assignment";
            var courseTitle = course?.Title ?? "Course";
            var assignmentId = submission.AssignmentId;
            var link = $"/teacher/assignments/{assignmentId}/submissions?submission={submission.Id}";
            var title = isResubmission ? "Assignment resubmitted" : "New assignment submission";
            var message = isResubmission
                ? $"{studentName} resubmitted \"{assignmentTitle}\" ({courseTitle})."
                : $"{studentName} submitted \"{assignmentTitle}\" ({courseTitle}).";

            var notifyResult = await _notificationService.CreateAsync(
                instructorId.Value,
                "assignment",
                title,
                message,
                link,
                null,
                null,
                cancellationToken);
            if (!notifyResult.IsSuccess)
                _logger.LogWarning("Could not notify instructor {InstructorId}: {Error}", instructorId, notifyResult.Error);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to notify instructor about assignment submission");
        }
    }

    /// <summary>
    /// Prefer stored <see cref="AssignmentSubmission.InstructorScore"/>; for legacy rows infer raw from final and late penalty.
    /// </summary>
    private static decimal? ResolveInstructorScoreForDto(AssignmentSubmission submission)
    {
        if (submission.InstructorScore.HasValue)
            return submission.InstructorScore;

        if (!submission.Score.HasValue || !submission.GradedAt.HasValue)
            return null;

        var assignment = submission.Assignment;
        if (assignment == null || !submission.IsLate || !assignment.LatePenaltyPercent.HasValue)
            return submission.Score;

        var p = assignment.LatePenaltyPercent.Value;
        if (p <= 0 || p >= 100)
            return submission.Score;

        var factor = 1m - p / 100m;
        return submission.Score.Value / factor;
    }
}






















