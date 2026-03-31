using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Exam;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class ExamService : IExamService
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ExamService> _logger;

    public ExamService(
        IApplicationDbContext context,
        INotificationService notificationService,
        ILogger<ExamService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<Result<ExamDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var exam = await _context.Exams
            .Include(e => e.Course)
            .Include(e => e.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, cancellationToken);

        if (exam == null)
        {
            return Result<ExamDto>.Failure("Exam not found.");
        }

        var examDto = MapToExamDto(exam);
        return Result<ExamDto>.Success(examDto);
    }

    public async Task<Result<PagedResult<ExamDto>>> GetByCourseAsync(Guid courseId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Exams
            .Include(e => e.Course)
            .Include(e => e.Questions.Where(q => !q.IsDeleted))
            .Where(e => e.CourseId == courseId && !e.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(e =>
                e.Title.ToLower().Contains(searchTerm) ||
                (e.Description != null && e.Description.ToLower().Contains(searchTerm)));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "title" => request.SortDescending
                ? query.OrderByDescending(e => e.Title)
                : query.OrderBy(e => e.Title),
            "start" => request.SortDescending
                ? query.OrderByDescending(e => e.StartsAt)
                : query.OrderBy(e => e.StartsAt),
            _ => query.OrderByDescending(e => e.StartsAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var exams = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var examDtos = exams.Select(MapToExamDto).ToList();

        return Result<PagedResult<ExamDto>>.Success(new PagedResult<ExamDto>
        {
            Items = examDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<ExamDto>> CreateAsync(CreateExamRequest request, CancellationToken cancellationToken = default)
    {
        // Validate course exists
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == request.CourseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<ExamDto>.Failure("Course not found.");
        }

        // Validate questions
        if (!request.Questions.Any())
        {
            return Result<ExamDto>.Failure("Exam must have at least one question.");
        }

        // Validate duration
        if (request.DurationMinutes <= 0)
        {
            return Result<ExamDto>.Failure("Duration must be greater than 0.");
        }

        // Prevent duplicate: same course, title, and start time
        var existing = await _context.Exams
            .FirstOrDefaultAsync(
                e => e.CourseId == request.CourseId &&
                     e.Title == request.Title &&
                     e.StartsAt == request.StartsAt &&
                     !e.IsDeleted,
                cancellationToken);
        if (existing != null)
        {
            return Result<ExamDto>.Failure(
                "An exam with this title and start time already exists for this course. Please use a different title or start time.");
        }

        // Create exam
        var exam = new Exam
        {
            CourseId = request.CourseId,
            Title = request.Title,
            Description = request.Description,
            StartsAt = request.StartsAt,
            DurationMinutes = request.DurationMinutes,
            AllowRetake = request.AllowRetake,
            MaxAttempts = request.MaxAttempts,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Exams.Add(exam);
        await _context.SaveChangesAsync(cancellationToken);

        // Add questions
        foreach (var questionRequest in request.Questions)
        {
            // Validate question type (normalize "Short Answer" -> "ShortAnswer" for parsing)
            var typeStr = questionRequest.Type?.Replace(" ", "") ?? "";
            if (!Enum.TryParse<QuestionType>(typeStr, true, out var questionType))
            {
                questionType = QuestionType.MultipleChoice; // Default
            }

            // For True/False, ensure only 2 choices
            if (questionType == QuestionType.TrueFalse && questionRequest.Choices?.Count != 2)
            {
                return Result<ExamDto>.Failure("True/False questions must have exactly 2 choices.");
            }

            // For ShortAnswer, allow empty choices (manual grading) — normalize before any index check
            if (questionType == QuestionType.ShortAnswer)
            {
                questionRequest.Choices ??= new List<string>();
                questionRequest.Choices = new List<string>(); // ensure empty for ShortAnswer
                questionRequest.AnswerIndex = 0;
            }
            else if (questionRequest.Choices != null && questionRequest.Choices.Count > 0)
            {
                if (questionRequest.AnswerIndex < 0 || questionRequest.AnswerIndex >= questionRequest.Choices.Count)
                {
                    return Result<ExamDto>.Failure($"Invalid answer index for question: {questionRequest.Prompt}");
                }
            }

            var question = new ExamQuestion
            {
                ExamId = exam.Id,
                Prompt = questionRequest.Prompt,
                Type = questionType,
                AnswerIndex = questionRequest.AnswerIndex,
                Points = questionRequest.Points,
                Order = questionRequest.Order,
                CreatedAt = DateTime.UtcNow
            };

            question.SetChoices(questionRequest.Choices?.ToArray() ?? Array.Empty<string>());
            _context.ExamQuestions.Add(question);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload with relations
        var createdExam = await _context.Exams
            .Include(e => e.Course)
            .Include(e => e.Questions.Where(q => !q.IsDeleted))
            .FirstAsync(e => e.Id == exam.Id, cancellationToken);

        _logger.LogInformation("Exam {ExamId} created for course {CourseId} with {QuestionCount} questions", exam.Id, request.CourseId, request.Questions.Count);

        var examDto = MapToExamDto(createdExam);
        return Result<ExamDto>.Success(examDto);
    }

    public async Task<Result<ExamDto>> UpdateAsync(Guid id, CreateExamRequest request, CancellationToken cancellationToken = default)
    {
        var exam = await _context.Exams
            .Include(e => e.Questions)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, cancellationToken);

        if (exam == null)
        {
            return Result<ExamDto>.Failure("Exam not found.");
        }

        // Check if exam has attempts
        var hasAttempts = await _context.ExamAttempts
            .AnyAsync(a => a.ExamId == id && !a.IsDeleted, cancellationToken);

        if (hasAttempts)
        {
            return Result<ExamDto>.Failure("Cannot update exam that has attempts. Create a new exam instead.");
        }

        // Prevent duplicate: another exam (different id) with same course, title, start time
        var duplicate = await _context.Exams
            .FirstOrDefaultAsync(
                e => e.CourseId == request.CourseId &&
                     e.Title == request.Title &&
                     e.StartsAt == request.StartsAt &&
                     e.Id != id &&
                     !e.IsDeleted,
                cancellationToken);
        if (duplicate != null)
        {
            return Result<ExamDto>.Failure(
                "An exam with this title and start time already exists for this course. Please use a different title or start time.");
        }

        // Update exam fields
        exam.Title = request.Title;
        exam.Description = request.Description;
        exam.StartsAt = request.StartsAt;
        exam.DurationMinutes = request.DurationMinutes;
        exam.AllowRetake = request.AllowRetake;
        exam.MaxAttempts = request.MaxAttempts;
        exam.UpdatedAt = DateTime.UtcNow;

        // Remove old questions
        foreach (var question in exam.Questions.Where(q => !q.IsDeleted))
        {
            question.IsDeleted = true;
            question.DeletedAt = DateTime.UtcNow;
        }

        // Add new questions
        foreach (var questionRequest in request.Questions)
        {
            var typeStrUpdate = questionRequest.Type?.Replace(" ", "") ?? "";
            if (!Enum.TryParse<QuestionType>(typeStrUpdate, true, out var questionType))
            {
                questionType = QuestionType.MultipleChoice;
            }

            if (questionType == QuestionType.TrueFalse && questionRequest.Choices?.Count != 2)
            {
                return Result<ExamDto>.Failure("True/False questions must have exactly 2 choices.");
            }

            if (questionType == QuestionType.ShortAnswer)
            {
                questionRequest.Choices ??= new List<string>();
                questionRequest.Choices = new List<string>();
                questionRequest.AnswerIndex = 0;
            }
            else if (questionRequest.Choices != null && questionRequest.Choices.Count > 0)
            {
                if (questionRequest.AnswerIndex < 0 || questionRequest.AnswerIndex >= questionRequest.Choices.Count)
                {
                    return Result<ExamDto>.Failure($"Invalid answer index for question: {questionRequest.Prompt}");
                }
            }

            var question = new ExamQuestion
            {
                ExamId = exam.Id,
                Prompt = questionRequest.Prompt,
                Type = questionType,
                AnswerIndex = questionRequest.AnswerIndex,
                Points = questionRequest.Points,
                Order = questionRequest.Order,
                CreatedAt = DateTime.UtcNow
            };

            question.SetChoices(questionRequest.Choices?.ToArray() ?? Array.Empty<string>());
            _context.ExamQuestions.Add(question);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload
        var updatedExam = await _context.Exams
            .Include(e => e.Course)
            .Include(e => e.Questions.Where(q => !q.IsDeleted))
            .FirstAsync(e => e.Id == exam.Id, cancellationToken);

        var examDto = MapToExamDto(updatedExam);
        return Result<ExamDto>.Success(examDto);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var exam = await _context.Exams
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, cancellationToken);

        if (exam == null)
        {
            return Result.Failure("Exam not found.");
        }

        // Check if exam has attempts
        var hasAttempts = await _context.ExamAttempts
            .AnyAsync(a => a.ExamId == id && !a.IsDeleted, cancellationToken);

        if (hasAttempts)
        {
            return Result.Failure("Cannot delete exam with attempts. Deactivate it instead.");
        }

        // Soft delete
        exam.IsDeleted = true;
        exam.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Exam {ExamId} deleted", id);

        return Result.Success();
    }

    public async Task<Result<StartExamResponse>> StartExamAsync(StartExamRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Validate exam exists and is active
        var exam = await _context.Exams
            .Include(e => e.Course)
            .Include(e => e.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(e => e.Id == request.ExamId && !e.IsDeleted, cancellationToken);

        if (exam == null)
        {
            return Result<StartExamResponse>.Failure("Exam not found.");
        }

        if (!exam.IsActive)
        {
            return Result<StartExamResponse>.Failure("Exam is not active.");
        }

        // Check if exam has started
        if (DateTime.UtcNow < exam.StartsAt)
        {
            return Result<StartExamResponse>.Failure("Exam has not started yet.");
        }

        // Validate user is enrolled in the course
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e =>
                e.UserId == userId &&
                e.CourseId == exam.CourseId &&
                !e.IsDeleted &&
                e.Status == EnrollmentStatus.Active,
                cancellationToken);

        if (enrollment == null)
        {
            return Result<StartExamResponse>.Failure("You must be enrolled in the course to take the exam.");
        }

        // Check for existing in-progress attempt
        var inProgressAttempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a =>
                a.ExamId == request.ExamId &&
                a.UserId == userId &&
                !a.IsDeleted &&
                a.SubmittedAt == null,
                cancellationToken);

        if (inProgressAttempt != null)
        {
            // Return existing attempt
            var questions = exam.Questions
                .Where(q => !q.IsDeleted)
                .OrderBy(q => q.Order)
                .Select(q => MapToQuestionDto(q, includeAnswer: false))
                .ToList();

            return Result<StartExamResponse>.Success(new StartExamResponse
            {
                AttemptId = inProgressAttempt.Id,
                StartedAt = inProgressAttempt.StartedAt,
                DurationMinutes = exam.DurationMinutes,
                ExpiresAt = inProgressAttempt.StartedAt.AddMinutes(exam.DurationMinutes),
                Questions = questions
            });
        }

        // Check attempt limits
        var attemptCount = await _context.ExamAttempts
            .CountAsync(a =>
                a.ExamId == request.ExamId &&
                a.UserId == userId &&
                !a.IsDeleted,
                cancellationToken);

        if (!exam.AllowRetake && attemptCount > 0)
        {
            return Result<StartExamResponse>.Failure("You have already taken this exam and retakes are not allowed.");
        }

        if (exam.MaxAttempts.HasValue && attemptCount >= exam.MaxAttempts.Value)
        {
            return Result<StartExamResponse>.Failure($"Maximum attempts ({exam.MaxAttempts.Value}) reached.");
        }

        // Create new attempt
        var attempt = new ExamAttempt
        {
            ExamId = request.ExamId,
            UserId = userId,
            StartedAt = DateTime.UtcNow,
            Score = 0,
            Total = (int)exam.Questions.Where(q => !q.IsDeleted).Sum(q => q.Points),
            Percentage = 0,
            CreatedAt = DateTime.UtcNow
        };

        _context.ExamAttempts.Add(attempt);
        await _context.SaveChangesAsync(cancellationToken);

        // Get questions (without answers)
        var questionDtos = exam.Questions
            .Where(q => !q.IsDeleted)
            .OrderBy(q => q.Order)
            .Select(q => MapToQuestionDto(q, includeAnswer: false))
            .ToList();

        _logger.LogInformation("User {UserId} started exam {ExamId}, attempt {AttemptId}", userId, request.ExamId, attempt.Id);

        return Result<StartExamResponse>.Success(new StartExamResponse
        {
            AttemptId = attempt.Id,
            StartedAt = attempt.StartedAt,
            DurationMinutes = exam.DurationMinutes,
            ExpiresAt = attempt.StartedAt.AddMinutes(exam.DurationMinutes),
            Questions = questionDtos
        });
    }

    public async Task<Result<ExamAttemptDto>> SubmitExamAsync(SubmitExamRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        // Get attempt
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e.Questions.Where(q => !q.IsDeleted))
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == request.AttemptId && !a.IsDeleted, cancellationToken);

        if (attempt == null)
        {
            return Result<ExamAttemptDto>.Failure("Exam attempt not found.");
        }

        // Ownership check
        if (attempt.UserId != userId)
        {
            return Result<ExamAttemptDto>.Failure("You can only submit your own exam attempts.");
        }

        // Check if already submitted
        if (attempt.SubmittedAt.HasValue)
        {
            return Result<ExamAttemptDto>.Failure("Exam has already been submitted.");
        }

        // Check time limit
        var timeElapsed = DateTime.UtcNow - attempt.StartedAt;
        if (timeElapsed.TotalMinutes > attempt.Exam.DurationMinutes)
        {
            // Auto-submit if time exceeded
            _logger.LogWarning("Exam attempt {AttemptId} exceeded time limit, auto-submitting", attempt.Id);
        }

        // Save answers
        attempt.SetAnswers(request.Answers);
        if (request.AnswerTexts != null && request.AnswerTexts.Count > 0)
            attempt.SetShortAnswerTexts(request.AnswerTexts);
        attempt.SubmittedAt = DateTime.UtcNow;
        attempt.UpdatedAt = DateTime.UtcNow;

        // Auto-grade objective questions (MCQ and True/False)
        var gradingResult = AutoGradeExam(attempt);
        attempt.Score = gradingResult.Score;
        attempt.Total = gradingResult.Total;
        attempt.Percentage = attempt.Total > 0 
            ? (decimal)attempt.Score / attempt.Total * 100 
            : 0;

        await _context.SaveChangesAsync(cancellationToken);

        // Reload
        var submittedAttempt = await _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e.Course)
            .Include(a => a.User)
            .FirstAsync(a => a.Id == attempt.Id, cancellationToken);

        _logger.LogInformation("User {UserId} submitted exam {ExamId}, attempt {AttemptId}, score: {Score}/{Total}", 
            userId, attempt.ExamId, attempt.Id, attempt.Score, attempt.Total);

        await NotifyInstructorExamSubmittedAsync(submittedAttempt, cancellationToken);

        var attemptDto = MapToAttemptDto(submittedAttempt, forStudentView: true);
        return Result<ExamAttemptDto>.Success(attemptDto);
    }

    public async Task<Result<ExamAttemptDto>> GetAttemptAsync(Guid attemptId, Guid userId, CancellationToken cancellationToken = default)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId && !a.IsDeleted, cancellationToken);

        if (attempt == null)
        {
            return Result<ExamAttemptDto>.Failure("Exam attempt not found.");
        }

        // Ownership check
        if (attempt.UserId != userId)
        {
            return Result<ExamAttemptDto>.Failure("You can only view your own exam attempts.");
        }

        var attemptDto = MapToAttemptDto(attempt, forStudentView: true);
        return Result<ExamAttemptDto>.Success(attemptDto);
    }

    public async Task<Result<ExamResultDto>> GetExamResultAsync(Guid attemptId, Guid userId, CancellationToken cancellationToken = default)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e.Questions.Where(q => !q.IsDeleted))
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId && !a.IsDeleted, cancellationToken);

        if (attempt == null)
        {
            return Result<ExamResultDto>.Failure("Exam attempt not found.");
        }

        // Ownership check
        if (attempt.UserId != userId)
        {
            return Result<ExamResultDto>.Failure("You can only view your own exam attempts.");
        }

        // Only return results for submitted attempts
        if (!attempt.SubmittedAt.HasValue)
        {
            return Result<ExamResultDto>.Failure("Exam has not been submitted yet.");
        }

        var userAnswers = attempt.GetAnswers();
        var questions = attempt.Exam.Questions
            .Where(q => !q.IsDeleted)
            .OrderBy(q => q.Order)
            .ToList();

        var questionResults = questions.Select(q =>
        {
            var questionId = q.Id.ToString();
            var hasUserAnswer = userAnswers.TryGetValue(questionId, out var userAnswerIndex);
            var isCorrect = hasUserAnswer && userAnswerIndex == q.AnswerIndex;

            return new ExamQuestionResultDto
            {
                Id = q.Id,
                ExamId = q.ExamId,
                Prompt = q.Prompt,
                Type = q.Type.ToString(),
                Choices = q.GetChoices().ToList(),
                Order = q.Order,
                Points = q.Points,
                CorrectAnswerIndex = q.AnswerIndex,
                UserAnswerIndex = hasUserAnswer ? userAnswerIndex : null,
                IsCorrect = isCorrect
            };
        }).ToList();

        var scorePublished = attempt.ScorePublishedAt.HasValue;
        var result = new ExamResultDto
        {
            AttemptId = attempt.Id,
            ExamId = attempt.ExamId,
            ExamTitle = attempt.Exam?.Title ?? string.Empty,
            Score = scorePublished ? attempt.Score : 0,
            Total = attempt.Total,
            Percentage = scorePublished ? attempt.Percentage : 0,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            ScorePublishedAt = attempt.ScorePublishedAt,
            Questions = questionResults
        };

        return Result<ExamResultDto>.Success(result);
    }

    public async Task<Result<PagedResult<ExamAttemptDto>>> GetAttemptsByExamAsync(Guid examId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.ExamAttempts
            .Include(a => a.Exam)
            .Include(a => a.User)
            .Where(a => a.ExamId == examId && !a.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(a =>
                a.User.FirstName.ToLower().Contains(searchTerm) ||
                a.User.LastName.ToLower().Contains(searchTerm) ||
                a.User.Email.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "user" => request.SortDescending
                ? query.OrderByDescending(a => a.User.LastName).ThenByDescending(a => a.User.FirstName)
                : query.OrderBy(a => a.User.LastName).ThenBy(a => a.User.FirstName),
            "score" => request.SortDescending
                ? query.OrderByDescending(a => a.Score)
                : query.OrderBy(a => a.Score),
            "submitted" => request.SortDescending
                ? query.OrderByDescending(a => a.SubmittedAt ?? a.StartedAt)
                : query.OrderBy(a => a.SubmittedAt ?? a.StartedAt),
            _ => query.OrderByDescending(a => a.SubmittedAt ?? a.StartedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var attempts = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var attemptDtos = attempts.Select(a => MapToAttemptDto(a, forStudentView: false, includeUserEmail: true)).ToList();

        return Result<PagedResult<ExamAttemptDto>>.Success(new PagedResult<ExamAttemptDto>
        {
            Items = attemptDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<ExamAttemptDto>> UpdateAttemptScoreAsync(Guid attemptId, Guid instructorId, UpdateAttemptScoreRequest request, CancellationToken cancellationToken = default)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
            .ThenInclude(e => e!.Course)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId && !a.IsDeleted, cancellationToken);

        if (attempt == null)
            return Result<ExamAttemptDto>.Failure("Exam attempt not found.");

        if (attempt.Exam?.Course == null || attempt.Exam.Course.InstructorId != instructorId)
            return Result<ExamAttemptDto>.Failure("You can only update grades for exams in your courses.");

        if (!attempt.SubmittedAt.HasValue)
            return Result<ExamAttemptDto>.Failure("Cannot grade an attempt that has not been submitted.");

        var total = attempt.Total;
        if (request.Score < 0 || (total > 0 && request.Score > total))
            return Result<ExamAttemptDto>.Failure($"Score must be between 0 and {total}.");

        attempt.Score = request.Score;
        attempt.Total = total;
        attempt.Percentage = total > 0 ? (decimal)attempt.Score / total * 100 : 0;
        attempt.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Instructor {InstructorId} updated attempt {AttemptId} score to {Score}/{Total}", instructorId, attemptId, attempt.Score, total);

        var dto = MapToAttemptDto(attempt, forStudentView: false);
        return Result<ExamAttemptDto>.Success(dto);
    }

    public async Task<Result<ExamAttemptDto>> PublishAttemptScoreAsync(Guid attemptId, Guid instructorId, CancellationToken cancellationToken = default)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
            .ThenInclude(e => e!.Course)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId && !a.IsDeleted, cancellationToken);

        if (attempt == null)
            return Result<ExamAttemptDto>.Failure("Exam attempt not found.");

        if (attempt.Exam?.Course == null || attempt.Exam.Course.InstructorId != instructorId)
            return Result<ExamAttemptDto>.Failure("You can only publish scores for exams in your courses.");

        if (!attempt.SubmittedAt.HasValue)
            return Result<ExamAttemptDto>.Failure("Cannot publish an attempt that has not been submitted.");

        if (attempt.ScorePublishedAt.HasValue)
            return Result<ExamAttemptDto>.Failure("Score is already published for this attempt.");

        attempt.ScorePublishedAt = DateTime.UtcNow;
        attempt.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Instructor {InstructorId} published score for attempt {AttemptId}, user {UserId}", instructorId, attemptId, attempt.UserId);

        // Create notification for student
        var examTitle = attempt.Exam?.Title ?? "Exam";
        var courseTitle = attempt.Exam?.Course?.Title ?? "Course";
        var link = "/student/exams";
        await _notificationService.CreateAsync(attempt.UserId, "exam", "Exam Score Published", $"Your score for {examTitle} ({courseTitle}) has been published. Score: {attempt.Score}/{attempt.Total}.", link, null, null, cancellationToken);

        var dto = MapToAttemptDto(attempt, forStudentView: false, includeUserEmail: true);
        return Result<ExamAttemptDto>.Success(dto);
    }

    public async Task<Result<ExamResultDto>> GetAttemptSubmissionForInstructorAsync(Guid attemptId, Guid instructorId, CancellationToken cancellationToken = default)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e!.Questions.Where(q => !q.IsDeleted))
            .Include(a => a.Exam!.Course)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId && !a.IsDeleted, cancellationToken);

        if (attempt == null)
            return Result<ExamResultDto>.Failure("Exam attempt not found.");

        if (attempt.Exam?.Course == null || attempt.Exam.Course.InstructorId != instructorId)
            return Result<ExamResultDto>.Failure("You can only view submissions for exams in your courses.");

        if (!attempt.SubmittedAt.HasValue)
            return Result<ExamResultDto>.Failure("This attempt has not been submitted yet.");

        var userAnswers = attempt.GetAnswers();
        var shortAnswerTexts = attempt.GetShortAnswerTexts();
        var questions = attempt.Exam!.Questions
            .Where(q => !q.IsDeleted)
            .OrderBy(q => q.Order)
            .ToList();

        var questionResults = questions.Select(q =>
        {
            var questionId = q.Id.ToString();
            var hasUserAnswer = userAnswers.TryGetValue(questionId, out var userAnswerIndex);
            var choices = q.GetChoices().ToList();
            shortAnswerTexts.TryGetValue(questionId, out var userAnswerText);
            var isCorrect = q.Type == QuestionType.ShortAnswer
                ? false
                : (hasUserAnswer && userAnswerIndex == q.AnswerIndex);

            return new ExamQuestionResultDto
            {
                Id = q.Id,
                ExamId = q.ExamId,
                Prompt = q.Prompt,
                Type = q.Type.ToString(),
                Choices = choices,
                Order = q.Order,
                Points = q.Points,
                CorrectAnswerIndex = q.AnswerIndex,
                UserAnswerIndex = hasUserAnswer ? userAnswerIndex : null,
                UserAnswerText = q.Type == QuestionType.ShortAnswer ? userAnswerText : null,
                IsCorrect = isCorrect
            };
        }).ToList();

        var result = new ExamResultDto
        {
            AttemptId = attempt.Id,
            ExamId = attempt.ExamId,
            ExamTitle = attempt.Exam?.Title ?? string.Empty,
            Score = attempt.Score,
            Total = attempt.Total,
            Percentage = attempt.Percentage,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            ScorePublishedAt = attempt.ScorePublishedAt,
            Questions = questionResults
        };

        return Result<ExamResultDto>.Success(result);
    }

    public async Task<Result<PagedResult<ExamAttemptDto>>> GetAttemptsByUserAsync(Guid userId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.ExamAttempts
            .Include(a => a.Exam)
            .Include(a => a.User)
            .Where(a => a.UserId == userId && !a.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(a =>
                a.Exam.Title.ToLower().Contains(searchTerm));
        }

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "exam" => request.SortDescending
                ? query.OrderByDescending(a => a.Exam.Title)
                : query.OrderBy(a => a.Exam.Title),
            "score" => request.SortDescending
                ? query.OrderByDescending(a => a.Score)
                : query.OrderBy(a => a.Score),
            "submitted" => request.SortDescending
                ? query.OrderByDescending(a => a.SubmittedAt ?? a.StartedAt)
                : query.OrderBy(a => a.SubmittedAt ?? a.StartedAt),
            _ => query.OrderByDescending(a => a.SubmittedAt ?? a.StartedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var attempts = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var attemptDtos = attempts.Select(a => MapToAttemptDto(a, forStudentView: true)).ToList();

        return Result<PagedResult<ExamAttemptDto>>.Success(new PagedResult<ExamAttemptDto>
        {
            Items = attemptDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    private async Task NotifyInstructorExamSubmittedAsync(ExamAttempt attempt, CancellationToken cancellationToken)
    {
        try
        {
            var exam = attempt.Exam;
            var course = exam?.Course;
            var instructorId = course?.InstructorId;
            if (!instructorId.HasValue || instructorId.Value == attempt.UserId)
                return;

            var studentName = attempt.User != null
                ? (string.IsNullOrWhiteSpace(attempt.User.FullName) ? attempt.User.Email : attempt.User.FullName.Trim())
                : "A student";
            var examTitle = exam?.Title ?? "Exam";
            var courseTitle = course?.Title ?? "Course";
            var link = $"/teacher/exams/{exam!.Id}?attempt={attempt.Id}";
            var scoreNote = attempt.Total > 0
                ? $" Auto-graded score: {attempt.Score}/{attempt.Total}."
                : string.Empty;
            var message = $"{studentName} submitted \"{examTitle}\" ({courseTitle}).{scoreNote}";

            var notifyResult = await _notificationService.CreateAsync(
                instructorId.Value,
                "exam",
                "Exam submitted",
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
            _logger.LogWarning(ex, "Failed to notify instructor about exam submission");
        }
    }

    /// <summary>
    /// Auto-grades objective questions (MCQ and True/False)
    /// Short Answer questions are not auto-graded (for future implementation)
    /// </summary>
    private (int Score, int Total) AutoGradeExam(ExamAttempt attempt)
    {
        var questions = attempt.Exam.Questions.Where(q => !q.IsDeleted).ToList();
        var answers = attempt.GetAnswers();
        
        int score = 0;
        int total = 0;

        foreach (var question in questions)
        {
            total += (int)question.Points;

            // Only auto-grade objective questions
            if (question.Type == QuestionType.MultipleChoice || question.Type == QuestionType.TrueFalse)
            {
                var questionId = question.Id.ToString();
                if (answers.TryGetValue(questionId, out var userAnswer))
                {
                    if (userAnswer == question.AnswerIndex)
                    {
                        score += (int)question.Points;
                    }
                }
            }
            // Short Answer questions are not auto-graded (score remains 0)
        }

        return (score, total);
    }

    private static ExamDto MapToExamDto(Exam exam)
    {
        return new ExamDto
        {
            Id = exam.Id,
            CourseId = exam.CourseId,
            CourseTitle = exam.Course?.Title ?? string.Empty,
            Title = exam.Title,
            Description = exam.Description,
            StartsAt = exam.StartsAt,
            DurationMinutes = exam.DurationMinutes,
            IsActive = exam.IsActive,
            AllowRetake = exam.AllowRetake,
            MaxAttempts = exam.MaxAttempts,
            QuestionCount = exam.Questions.Count(q => !q.IsDeleted),
            CreatedAt = exam.CreatedAt
        };
    }

    private static ExamQuestionDto MapToQuestionDto(ExamQuestion question, bool includeAnswer = false)
    {
        return new ExamQuestionDto
        {
            Id = question.Id,
            ExamId = question.ExamId,
            Prompt = question.Prompt,
            Type = question.Type.ToString(),
            Choices = question.GetChoices().ToList(),
            Order = question.Order,
            Points = question.Points
            // AnswerIndex is never included for security
        };
    }

    private static ExamAttemptDto MapToAttemptDto(ExamAttempt attempt, bool forStudentView = false, bool includeUserEmail = false)
    {
        var scorePublished = attempt.ScorePublishedAt.HasValue;
        var maskScore = forStudentView && !scorePublished;
        return new ExamAttemptDto
        {
            Id = attempt.Id,
            ExamId = attempt.ExamId,
            ExamTitle = attempt.Exam?.Title ?? string.Empty,
            UserId = attempt.UserId,
            UserName = attempt.User?.FullName ?? string.Empty,
            UserEmail = includeUserEmail ? attempt.User?.Email : null,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            Score = maskScore ? 0 : attempt.Score,
            Total = attempt.Total,
            Percentage = maskScore ? 0 : attempt.Percentage,
            ScorePublishedAt = attempt.ScorePublishedAt
        };
    }
}









