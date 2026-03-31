namespace AcademixLMS.Application.DTOs.Message;

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid FromUserId { get; set; }
    public string FromUserName { get; set; } = string.Empty;
    public Guid ToUserId { get; set; }
    public string ToUserName { get; set; } = string.Empty;
    public Guid? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public bool IsArchived { get; set; }
}

public class SendMessageRequest
{
    public Guid ToUserId { get; set; }
    public Guid? CourseId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class MarkMessageReadRequest
{
    public bool IsRead { get; set; } = true;
}


