namespace AcademixLMS.Application.DTOs.Exam;

public class ExamDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartsAt { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsActive { get; set; }
    public bool AllowRetake { get; set; }
    public int? MaxAttempts { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ExamQuestionDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // MultipleChoice, TrueFalse
    public List<string> Choices { get; set; } = new();
    public int Order { get; set; }
    public decimal Points { get; set; }
    // Note: AnswerIndex is NOT included for security (only in grading)
}

public class ExamAttemptDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserEmail { get; set; } // Optional, for teacher (e.g. when publishing to send notification)
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int Score { get; set; }
    public int Total { get; set; }
    public decimal Percentage { get; set; }
    /// <summary>When set, the student can see their score.</summary>
    public DateTime? ScorePublishedAt { get; set; }
}

public class CreateExamRequest
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartsAt { get; set; }
    public int DurationMinutes { get; set; }
    public bool AllowRetake { get; set; } = false;
    public int? MaxAttempts { get; set; }
    public List<CreateExamQuestionRequest> Questions { get; set; } = new();
}

public class CreateExamQuestionRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = "MultipleChoice"; // MultipleChoice, TrueFalse
    public List<string> Choices { get; set; } = new();
    public int AnswerIndex { get; set; }
    public decimal Points { get; set; } = 1.0m;
    public int Order { get; set; }
}

public class StartExamRequest
{
    public Guid ExamId { get; set; }
}

public class StartExamResponse
{
    public Guid AttemptId { get; set; }
    public DateTime StartedAt { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime ExpiresAt { get; set; }
    public List<ExamQuestionDto> Questions { get; set; } = new();
}

public class SubmitExamRequest
{
    public Guid AttemptId { get; set; }
    public Dictionary<string, int> Answers { get; set; } = new(); // QuestionId -> ChoiceIndex
    /// <summary>QuestionId -> text (for ShortAnswer questions).</summary>
    public Dictionary<string, string>? AnswerTexts { get; set; }
}

public class UpdateAttemptScoreRequest
{
    public int Score { get; set; }
}

public class ExamQuestionResultDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<string> Choices { get; set; } = new();
    public int Order { get; set; }
    public decimal Points { get; set; }
    public int CorrectAnswerIndex { get; set; } // Only included for submitted attempts
    public int? UserAnswerIndex { get; set; } // User's answer (null if not answered)
    /// <summary>For ShortAnswer: the text the student submitted.</summary>
    public string? UserAnswerText { get; set; }
    public bool IsCorrect { get; set; }
}

public class ExamResultDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public int Score { get; set; }
    public int Total { get; set; }
    public decimal Percentage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ScorePublishedAt { get; set; }
    public List<ExamQuestionResultDto> Questions { get; set; } = new();
}


