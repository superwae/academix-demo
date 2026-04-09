using System.Text.Json;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DomainDay = AcademixLMS.Domain.Common.DayOfWeek;

namespace AcademixLMS.Infrastructure.Data;

/// <summary>
/// Development-only: 10 instructors, each with 5 published courses, 3 sections per course,
/// 10 YouTube lessons per course, 1 assignment, 1 exam (10 questions using all QuestionType values).
/// Idempotent: skips if prof01@academix.com already exists.
/// </summary>
public static class DemoFacultyBulkSeeder
{
    public const string DemoPassword = DevAccountsSeeder.DefaultPassword;
    private const string MarkerEmail = "prof01@academix.com";

    private static readonly (string First, string Last)[] Professors =
    [
        ("Samir", "Hassan"),
        ("Layla", "Nasser"),
        ("Omar", "Farid"),
        ("Rana", "Khalil"),
        ("Karim", "Sabbagh"),
        ("Nour", "Mansour"),
        ("Tariq", "Barakat"),
        ("Dina", "Haddad"),
        ("Youssef", "Awad"),
        ("Maya", "Rahman")
    ];

    /// <summary>5 course titles per professor (row index = professor index).</summary>
    private static readonly string[][] CourseTitles =
    [
        ["Python Programming I", "Python Programming II", "Data Structures", "Web Fundamentals", "SQL & Databases"],
        ["Calculus I", "Linear Algebra", "Probability & Statistics", "Discrete Mathematics", "Numerical Methods"],
        ["Organic Chemistry", "Physical Chemistry", "Biochemistry Basics", "Lab Safety", "Analytical Chemistry"],
        ["Microeconomics", "Macroeconomics", "Corporate Finance", "Financial Accounting", "Business Analytics"],
        ["English Composition", "Technical Writing", "World Literature", "Public Speaking", "Research Methods"],
        ["Physics I", "Physics II", "Thermodynamics", "Electromagnetism", "Introduction to Quantum Physics"],
        ["Spanish Language I", "Spanish Language II", "Spanish Grammar & Composition", "Hispanic Literature Survey", "Conversation & Culture"],
        ["UI/UX Design", "Visual Design", "3D Modeling Basics", "Motion Design Intro", "Design Systems"],
        ["Project Management", "Agile Delivery", "Risk Management", "Quality Assurance", "Leadership Skills"],
        ["Operating Systems", "Computer Networks", "Information Security", "Distributed Systems", "Cloud Computing"]
    ];

    private static readonly string[] Categories =
    [
        "Computer Science", "Mathematics", "Chemistry", "Business", "Humanities",
        "Physics", "Languages", "Design", "Management", "Computer Science"
    ];

    /// <summary>Unsplash cover images (education, STEM, business). Cycled per course.</summary>
    private static readonly string[] CourseThumbnailUrls =
    [
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1532619675605-1ede6c778ed1?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1523240778108-9dcb8eaf79c2?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=800&q=80"
    ];

    /// <summary>Recorded public YouTube lectures (watch URLs). Rotated so courses get varied links.</summary>
    private static readonly string[] RecordedYoutubeLessons =
    [
        "https://www.youtube.com/watch?v=aircAruvnKk",
        "https://www.youtube.com/watch?v=zOjov-2OZ0E",
        "https://www.youtube.com/watch?v=HcOcQa1a1qg",
        "https://www.youtube.com/watch?v=WQeoO7MI0Bw",
        "https://www.youtube.com/watch?v=yRPivZd4UfI",
        "https://www.youtube.com/watch?v=5MgBikgcgaQ",
        "https://www.youtube.com/watch?v=eKzH1yfxhKk",
        "https://www.youtube.com/watch?v=8D9PpRChRMI",
        "https://www.youtube.com/watch?v=JyM3CqB8Q7g",
        "https://www.youtube.com/watch?v=LwAkikmJwyk",
        "https://www.youtube.com/watch?v=Hl3bT0C8GEc",
        "https://www.youtube.com/watch?v=WKfZsUESr9M",
        "https://www.youtube.com/watch?v=GtOt7UBbZBE",
        "https://www.youtube.com/watch?v=OVF7oO9Zc08",
        "https://www.youtube.com/watch?v=tpIctyqH29Q",
        "https://www.youtube.com/watch?v=wjZofJX0v4M",
        "https://www.youtube.com/watch?v=3ez10ADR_gM",
        "https://www.youtube.com/watch?v=K4qTns5cf0E",
        "https://www.youtube.com/watch?v=84T_iH97gOQ",
        "https://www.youtube.com/watch?v=HCg7jbW0l38",
        "https://www.youtube.com/watch?v=FrN3j8RSbG4",
        "https://www.youtube.com/watch?v=Z19zFlPah-o",
        "https://www.youtube.com/watch?v=RGkGfXwXFxM",
        "https://www.youtube.com/watch?v=erDfX_1yJ8Q",
        "https://www.youtube.com/watch?v=9sRrkHbk2K8"
    ];

    private static readonly (string Name, string Location)[] SectionTemplates =
    [
        ("Section A — Morning", "Hall A / hybrid"),
        ("Section B — Afternoon", "Hall B / hybrid"),
        ("Section C — Evening", "Lab C / online")
    ];

    private const string DemoProviderName = "AcademiX Demo";

    /// <summary>
    /// Idempotent: sets <see cref="Course.ThumbnailUrl"/> for published demo courses that were created before thumbnails were added.
    /// Runs every Development startup so existing databases pick up images without wiping data.
    /// </summary>
    public static async Task BackfillDemoCourseThumbnailsAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var demoCourses = await context.Courses
            .Where(c =>
                !c.IsDeleted &&
                c.Status == CourseStatus.Published &&
                c.ProviderName == DemoProviderName &&
                (c.ThumbnailUrl == null || c.ThumbnailUrl == string.Empty))
            .OrderBy(c => c.InstructorId)
            .ThenBy(c => c.Title)
            .ToListAsync(cancellationToken);

        if (demoCourses.Count == 0)
        {
            return;
        }

        var n = CourseThumbnailUrls.Length;
        for (var i = 0; i < demoCourses.Count; i++)
        {
            demoCourses[i].ThumbnailUrl = CourseThumbnailUrls[i % n];
        }

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "DemoFacultyBulkSeeder: backfilled ThumbnailUrl for {Count} AcademiX Demo course(s).",
            demoCourses.Count);
    }

    public static async Task EnsureAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var exists = await context.Users.AnyAsync(
            u => u.Email.ToLower() == MarkerEmail && !u.IsDeleted,
            cancellationToken);
        if (exists)
        {
            logger.LogInformation("DemoFacultyBulkSeeder: already applied (found {Email}), skipping.", MarkerEmail);
            return;
        }

        var instructorRole = await context.Roles.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == "Instructor" && !r.IsDeleted, cancellationToken);
        if (instructorRole == null)
        {
            logger.LogWarning("DemoFacultyBulkSeeder: Instructor role missing. Skipping.");
            return;
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword);
        var now = DateTime.UtcNow;
        var courseStart = now.AddDays(-45);
        var courseEnd = now.AddDays(120);

        var professors = new List<User>();
        for (var i = 0; i < Professors.Length; i++)
        {
            var (fn, ln) = Professors[i];
            var email = $"prof{i + 1:00}@academix.com".ToLowerInvariant();
            var user = new User
            {
                Email = email,
                PasswordHash = passwordHash,
                FirstName = fn,
                LastName = ln,
                IsActive = true,
                IsEmailVerified = true,
                EmailVerifiedAt = now,
                CreatedAt = now
            };
            context.Users.Add(user);
            professors.Add(user);
        }

        await context.SaveChangesAsync(cancellationToken);

        foreach (var user in professors)
        {
            context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = instructorRole.Id,
                AssignedAt = now
            });
        }

        await context.SaveChangesAsync(cancellationToken);

        for (var ti = 0; ti < professors.Count; ti++)
        {
            var instructor = professors[ti];
            var titles = CourseTitles[ti];
            var category = Categories[ti];

            for (var ci = 0; ci < titles.Length; ci++)
            {
                var title = titles[ci];
                var course = new Course
                {
                    Title = title,
                    Description =
                        $"Comprehensive {title} course. Includes lectures, labs, assignments, and a proctored exam.",
                    Category = category,
                    Level = CourseLevel.Intermediate,
                    Modality = Modality.Hybrid,
                    ProviderType = ProviderType.University,
                    ProviderName = DemoProviderName,
                    InstructorId = instructor.Id,
                    Status = CourseStatus.Published,
                    IsFeatured = ci == 0,
                    Price = 0,
                    ThumbnailUrl = GetCourseThumbnailUrl(ti, ci),
                    ExpectedDurationHours = 40,
                    CourseStartDate = courseStart,
                    CourseEndDate = courseEnd,
                    CreatedAt = now
                };
                context.Courses.Add(course);
                await context.SaveChangesAsync(cancellationToken);

                // 3 sections per course — each gets a unique slot so the instructor's
                // calendar doesn't show 15 events stacked on the same time.
                // Day is determined by course index (0..4 → Mon..Fri).
                // Time is determined by section index (0=morning, 1=afternoon, 2=evening).
                var courseDay = (DomainDay)((ci % 5) + 1); // Monday=1, Friday=5
                for (var si = 0; si < SectionTemplates.Length; si++)
                {
                    var (secName, loc) = SectionTemplates[si];
                    var section = new CourseSection
                    {
                        CourseId = course.Id,
                        Name = secName,
                        LocationLabel = loc,
                        MaxSeats = 40,
                        SeatsRemaining = 25,
                        IsActive = true,
                        CreatedAt = now
                    };
                    context.CourseSections.Add(section);
                    await context.SaveChangesAsync(cancellationToken);

                    // Section index → time of day matching the section name
                    var (startHour, endHour) = si switch
                    {
                        0 => (8, 10),   // Morning
                        1 => (13, 15),  // Afternoon
                        _ => (17, 19),  // Evening
                    };

                    context.SectionMeetingTimes.Add(new SectionMeetingTime
                    {
                        SectionId = section.Id,
                        Day = courseDay,
                        StartMinutes = startHour * 60,
                        EndMinutes = endHour * 60,
                        CreatedAt = now
                    });
                }

                // 10 recorded lessons (YouTube watch URLs)
                for (var li = 0; li < 10; li++)
                {
                    var videoUrl = GetRecordedYoutubeUrl(ti, ci, li);
                    var lessonTitle = $"Lesson {li + 1}: {BuildLessonTopic(title, li)}";
                    context.Lessons.Add(new Lesson
                    {
                        CourseId = course.Id,
                        SectionId = null,
                        Title = lessonTitle,
                        Description =
                            $"Recorded lecture on YouTube for {title}. Watch the video and follow the module outline.",
                        VideoUrl = videoUrl,
                        DurationMinutes = 35 + (li % 5) * 5,
                        Order = li,
                        IsPreview = li == 0,
                        CreatedAt = now
                    });
                }

                // One assignment per course
                context.Assignments.Add(new Assignment
                {
                    CourseId = course.Id,
                    Title = $"{title} — Course project",
                    Prompt =
                        "Submit a written report (800–1200 words) or a short presentation deck summarizing the main " +
                        "ideas from weeks 1–4. Include references. This is a demo assignment.",
                    DueAt = now.AddDays(7 + ci),
                    Status = AssignmentStatus.Published,
                    MaxScore = 100,
                    Weight = 1,
                    AllowLateSubmission = true,
                    LatePenaltyPercent = 10,
                    CreatedAt = now
                });

                // One exam, 10 questions: 5 MC, 2 TF, 3 ShortAnswer (all types in domain)
                var exam = new Exam
                {
                    CourseId = course.Id,
                    Title = $"{title} — Course exam",
                    Description = "Demonstration exam covering core outcomes. Includes auto-graded and short-answer items.",
                    StartsAt = now.AddDays(10),
                    DurationMinutes = 90,
                    IsActive = true,
                    AllowRetake = false,
                    MaxAttempts = 1,
                    CreatedAt = now
                };
                context.Exams.Add(exam);
                await context.SaveChangesAsync(cancellationToken);

                AddExamQuestions(context, exam.Id, title, now);

                await context.SaveChangesAsync(cancellationToken);
            }
        }

        logger.LogInformation(
            "DemoFacultyBulkSeeder: created {Count} professors (prof01–prof10), each with 5 courses, sections, lessons, assignments, exams.",
            professors.Count);
    }

    private static string GetCourseThumbnailUrl(int professorIndex, int courseIndex)
    {
        var n = CourseThumbnailUrls.Length;
        var idx = (professorIndex * 5 + courseIndex) % n;
        return CourseThumbnailUrls[idx];
    }

    private static string GetRecordedYoutubeUrl(int professorIndex, int courseIndex, int lessonIndex)
    {
        var n = RecordedYoutubeLessons.Length;
        var idx = (professorIndex * 50 + courseIndex * 10 + lessonIndex) % n;
        return RecordedYoutubeLessons[idx];
    }

    private static string BuildLessonTopic(string courseTitle, int lessonIndex)
    {
        var topics = new[]
        {
            "Introduction & overview",
            "Core concepts",
            "Hands-on practice",
            "Applied examples",
            "Case study",
            "Deep dive",
            "Best practices",
            "Review & Q&A",
            "Assessment prep",
            "Summary & next steps"
        };
        return topics[lessonIndex % topics.Length];
    }

    private static void AddExamQuestions(ApplicationDbContext context, Guid examId, string courseTitle, DateTime now)
    {
        string J(string[] a) => JsonSerializer.Serialize(a);

        var q = 0;

        // 5 × Multiple choice
        for (var i = 0; i < 5; i++)
        {
            context.ExamQuestions.Add(new ExamQuestion
            {
                ExamId = examId,
                Prompt = $"[{courseTitle}] Question {i + 1}: Select the best answer.",
                Type = QuestionType.MultipleChoice,
                ChoicesJson = J(new[] { "Option A", "Option B", "Option C", "Option D" }),
                AnswerIndex = i % 4,
                Points = 10,
                Order = q++,
                CreatedAt = now
            });
        }

        // 2 × True/False
        for (var i = 0; i < 2; i++)
        {
            context.ExamQuestions.Add(new ExamQuestion
            {
                ExamId = examId,
                Prompt = $"[{courseTitle}] Statement {i + 1}: Mark True or False.",
                Type = QuestionType.TrueFalse,
                ChoicesJson = J(new[] { "True", "False" }),
                AnswerIndex = i % 2,
                Points = 10,
                Order = q++,
                CreatedAt = now
            });
        }

        // 3 × Short answer (manual grading; not auto-scored)
        for (var i = 0; i < 3; i++)
        {
            context.ExamQuestions.Add(new ExamQuestion
            {
                ExamId = examId,
                Prompt = $"[{courseTitle}] Short answer {i + 1}: Explain in 2–4 sentences.",
                Type = QuestionType.ShortAnswer,
                ChoicesJson = "[]",
                AnswerIndex = 0,
                Points = 10,
                Order = q++,
                CreatedAt = now
            });
        }
    }
}
