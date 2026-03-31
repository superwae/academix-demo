namespace AcademixLMS.Application.DTOs.Assignment;

public class AssignmentDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public DateTime DueAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal MaxScore { get; set; }
    public decimal Weight { get; set; }
    public bool AllowLateSubmission { get; set; }
    public int? LatePenaltyPercent { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AssignmentSubmissionDto
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public string AssignmentTitle { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? FileUrl { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? GradedAt { get; set; }
    public Guid? GradedBy { get; set; }
    public string? GraderName { get; set; }
    /// <summary>Instructor-entered points before late penalty; omitted when not graded.</summary>
    public decimal? InstructorScore { get; set; }
    /// <summary>Final grade recorded for the student (after late penalty when applicable).</summary>
    public decimal? Score { get; set; }
    public string? Feedback { get; set; }
    public bool IsLate { get; set; }
}

public class CreateAssignmentRequest
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public DateTime DueAt { get; set; }
    public decimal MaxScore { get; set; } = 100;
    public decimal Weight { get; set; } = 1.0m;
    public bool AllowLateSubmission { get; set; } = false;
    public int? LatePenaltyPercent { get; set; }
    /// <summary>Draft or Published (default Draft when omitted).</summary>
    public string? Status { get; set; }
}

public class UpdateAssignmentRequest
{
    public string? Title { get; set; }
    public string? Prompt { get; set; }
    public DateTime? DueAt { get; set; }
    public string? Status { get; set; }
    public decimal? MaxScore { get; set; }
    public decimal? Weight { get; set; }
    public bool? AllowLateSubmission { get; set; }
    public int? LatePenaltyPercent { get; set; }
}

public class SubmitAssignmentRequest
{
    public string Text { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? FileUrl { get; set; }
}

public class GradeSubmissionRequest
{
    /// <summary>Instructor-assigned points before automatic late penalty (max = assignment max score).</summary>
    public decimal Score { get; set; }
    public string? Feedback { get; set; }
    // GradedBy will be extracted from the authenticated user
}


