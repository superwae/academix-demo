using AcademixLMS.Domain.Common;

namespace AcademixLMS.Domain.Entities;

/// <summary>
/// Exam entity for course exams/quizzes
/// </summary>
public class Exam : BaseEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    public DateTime StartsAt { get; set; }
    public int DurationMinutes { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool AllowRetake { get; set; } = false;
    public int? MaxAttempts { get; set; }
    
    // Navigation Properties
    public Course Course { get; set; } = null!;
    public ICollection<ExamQuestion> Questions { get; set; } = new List<ExamQuestion>();
    public ICollection<ExamAttempt> Attempts { get; set; } = new List<ExamAttempt>();
}

/// <summary>
/// Exam question with multiple choice answers
/// </summary>
public class ExamQuestion : BaseEntity
{
    public Guid ExamId { get; set; }
    public string Prompt { get; set; } = string.Empty;
    
    public QuestionType Type { get; set; } = QuestionType.MultipleChoice;
    
    // JSON array stored as string - can be normalized later if needed
    public string ChoicesJson { get; set; } = string.Empty;
    
    public int AnswerIndex { get; set; }
    public decimal Points { get; set; } = 1.0m;
    public int Order { get; set; }
    
    // Navigation Properties
    public Exam Exam { get; set; } = null!;
    
    // Helper methods for Choices (can be moved to value object if needed)
    public string[] GetChoices() => 
        string.IsNullOrEmpty(ChoicesJson) 
            ? Array.Empty<string>() 
            : System.Text.Json.JsonSerializer.Deserialize<string[]>(ChoicesJson) ?? Array.Empty<string>();
    
    public void SetChoices(string[] choices) => 
        ChoicesJson = System.Text.Json.JsonSerializer.Serialize(choices);
}

/// <summary>
/// Exam attempt by a student
/// </summary>
public class ExamAttempt : BaseEntity
{
    public Guid ExamId { get; set; }
    public Guid UserId { get; set; }
    
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    
    // JSON dictionary: QuestionId -> ChoiceIndex
    public string AnswersJson { get; set; } = string.Empty;

    /// <summary>JSON dictionary: QuestionId -> text answer (for ShortAnswer questions).</summary>
    public string? ShortAnswerTextJson { get; set; }

    public int Score { get; set; }
    public int Total { get; set; }
    public decimal Percentage { get; set; }
    
    /// <summary>When set, the student can see their score; otherwise the grade is hidden until the teacher publishes.</summary>
    public DateTime? ScorePublishedAt { get; set; }
    
    // Navigation Properties
    public Exam Exam { get; set; } = null!;
    public User User { get; set; } = null!;
    
    // Helper methods for Answers
    public Dictionary<string, int> GetAnswers() =>
        string.IsNullOrEmpty(AnswersJson)
            ? new Dictionary<string, int>()
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, int>>(AnswersJson) ?? new Dictionary<string, int>();
    
    public void SetAnswers(Dictionary<string, int> answers) =>
        AnswersJson = System.Text.Json.JsonSerializer.Serialize(answers);

    public Dictionary<string, string> GetShortAnswerTexts() =>
        string.IsNullOrEmpty(ShortAnswerTextJson)
            ? new Dictionary<string, string>()
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(ShortAnswerTextJson) ?? new Dictionary<string, string>();

    public void SetShortAnswerTexts(Dictionary<string, string> texts) =>
        ShortAnswerTextJson = System.Text.Json.JsonSerializer.Serialize(texts);
}


