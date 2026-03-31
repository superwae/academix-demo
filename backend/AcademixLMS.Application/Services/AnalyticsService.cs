using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.AI;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

/// <summary>
/// Analytics service for student performance tracking, at-risk detection, and predictions
/// Uses rule-based algorithms and statistical analysis - no external ML API required
/// </summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<AnalyticsService> _logger;

    // Risk thresholds (configurable)
    private const int DaysInactiveWarning = 7;
    private const int DaysInactiveCritical = 14;
    private const double LowProgressThreshold = 25;
    private const double LowGradeThreshold = 60;

    public AnalyticsService(IApplicationDbContext context, ILogger<AnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<StudentAnalyticsDto>> GetStudentAnalyticsAsync(Guid studentId, CancellationToken cancellationToken = default)
    {
        try
        {
            var student = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == studentId && !u.IsDeleted, cancellationToken);

            if (student == null)
            {
                return Result<StudentAnalyticsDto>.Failure("Student not found.");
            }

            // Get all enrollments
            var enrollments = await _context.Enrollments
                .Include(e => e.Course)
                .Where(e => e.UserId == studentId && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get lesson progress
            var lessonProgress = await _context.LessonProgresses
                .Where(lp => lp.UserId == studentId && !lp.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get assignment submissions
            var submissions = await _context.AssignmentSubmissions
                .Include(s => s.Assignment)
                .Where(s => s.UserId == studentId && !s.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get exam attempts
            var examAttempts = await _context.ExamAttempts
                .Where(ea => ea.UserId == studentId && !ea.IsDeleted)
                .ToListAsync(cancellationToken);

            // Calculate metrics
            var totalEnrollments = enrollments.Count;
            var completedCourses = enrollments.Count(e => e.Status == EnrollmentStatus.Completed);
            var activeCourses = enrollments.Count(e => e.Status == EnrollmentStatus.Active);
            var droppedCourses = enrollments.Count(e => e.Status == EnrollmentStatus.Dropped);

            // Calculate average grade
            var gradedSubmissions = submissions.Where(s => s.Score.HasValue).ToList();
            var averageGrade = gradedSubmissions.Any()
                ? gradedSubmissions.Average(s => (double)s.Score!.Value / (double)s.Assignment.MaxScore * 100)
                : 0;

            // Include exam scores in average
            var examScores = examAttempts.Where(ea => ea.SubmittedAt.HasValue && ea.Total > 0)
                .Select(ea => (double)ea.Score / ea.Total * 100)
                .ToList();

            if (examScores.Any())
            {
                var allGrades = gradedSubmissions.Any()
                    ? (new List<double> { averageGrade }).Concat(examScores).Average()
                    : examScores.Average();
                averageGrade = allGrades;
            }

            // Calculate completion rate
            var completionRate = totalEnrollments > 0
                ? (double)completedCourses / totalEnrollments * 100
                : 0;

            // Last activity
            var lastLessonWatch = lessonProgress.MaxBy(lp => lp.LastWatchedAt)?.LastWatchedAt;
            var lastSubmission = submissions.MaxBy(s => s.SubmittedAt)?.SubmittedAt;
            var lastExam = examAttempts.MaxBy(ea => ea.StartedAt)?.StartedAt;

            var lastActivityAt = new[] { lastLessonWatch, lastSubmission, lastExam }
                .Where(d => d.HasValue)
                .DefaultIfEmpty(null)
                .Max();

            var daysSinceLastActivity = lastActivityAt.HasValue
                ? (int)(DateTime.UtcNow - lastActivityAt.Value).TotalDays
                : 999;

            // Calculate engagement score
            var engagementScore = CalculateEngagementScore(
                enrollments, lessonProgress, submissions, examAttempts, daysSinceLastActivity);

            // Calculate risk score and factors
            var (riskScore, riskFactors) = CalculateRiskScore(
                enrollments, averageGrade, daysSinceLastActivity, engagementScore, droppedCourses);

            // Predict final grade
            var predictedGrade = PredictFinalGrade(averageGrade, engagementScore, completionRate);

            // Generate recommendations
            var recommendations = GenerateStudentRecommendations(riskFactors, engagementScore, averageGrade);

            var analytics = new StudentAnalyticsDto
            {
                UserId = studentId,
                StudentName = student.FullName,
                Email = student.Email,
                ProfilePictureUrl = student.ProfilePictureUrl,

                EngagementScore = Math.Round(engagementScore, 1),
                EngagementLevel = GetEngagementLevel(engagementScore),

                RiskScore = Math.Round(riskScore, 1),
                RiskLevel = GetRiskLevel(riskScore),
                RiskFactors = riskFactors,

                AverageGrade = Math.Round(averageGrade, 1),
                PredictedFinalGrade = Math.Round(predictedGrade, 1),
                CompletionRate = Math.Round(completionRate, 1),

                TotalEnrollments = totalEnrollments,
                CompletedCourses = completedCourses,
                ActiveCourses = activeCourses,
                DroppedCourses = droppedCourses,
                TotalLessonsWatched = lessonProgress.Count(lp => lp.IsCompleted),
                TotalAssignmentsSubmitted = submissions.Count,
                TotalExamsTaken = examAttempts.Count(ea => ea.SubmittedAt.HasValue),
                LastActivityAt = lastActivityAt,
                DaysSinceLastActivity = daysSinceLastActivity,

                Recommendations = recommendations
            };

            return Result<StudentAnalyticsDto>.Success(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics for student {StudentId}", studentId);
            return Result<StudentAnalyticsDto>.Failure("Failed to get student analytics.");
        }
    }

    public async Task<Result<CourseAnalyticsDto>> GetCourseAnalyticsAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        try
        {
            var course = await _context.Courses
                .Include(c => c.Instructor)
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

            if (course == null)
            {
                return Result<CourseAnalyticsDto>.Failure("Course not found.");
            }

            // Get enrollments
            var enrollments = await _context.Enrollments
                .Include(e => e.User)
                .Where(e => e.CourseId == courseId && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get lessons
            var lessons = await _context.Lessons
                .Where(l => l.CourseId == courseId && !l.IsDeleted)
                .OrderBy(l => l.Order)
                .ToListAsync(cancellationToken);

            // Get lesson progress
            var lessonProgress = await _context.LessonProgresses
                .Where(lp => lp.CourseId == courseId && !lp.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get assignments
            var assignments = await _context.Assignments
                .Where(a => a.CourseId == courseId && !a.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get assignment submissions
            var submissions = await _context.AssignmentSubmissions
                .Include(s => s.Assignment)
                .Where(s => s.Assignment.CourseId == courseId && !s.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get exams
            var exams = await _context.Exams
                .Where(e => e.CourseId == courseId && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            // Get exam attempts
            var examAttempts = await _context.ExamAttempts
                .Include(ea => ea.Exam)
                .Where(ea => ea.Exam.CourseId == courseId && !ea.IsDeleted)
                .ToListAsync(cancellationToken);

            // Calculate stats
            var totalEnrollments = enrollments.Count;
            var activeStudents = enrollments.Count(e => e.Status == EnrollmentStatus.Active);
            var completedStudents = enrollments.Count(e => e.Status == EnrollmentStatus.Completed);
            var droppedStudents = enrollments.Count(e => e.Status == EnrollmentStatus.Dropped);

            var completionRate = totalEnrollments > 0
                ? (double)completedStudents / totalEnrollments * 100
                : 0;
            var dropRate = totalEnrollments > 0
                ? (double)droppedStudents / totalEnrollments * 100
                : 0;

            var averageProgress = enrollments.Any()
                ? enrollments.Average(e => (double)e.ProgressPercentage)
                : 0;

            // Assignment stats
            var gradedSubmissions = submissions.Where(s => s.Score.HasValue).ToList();
            var avgAssignmentScore = gradedSubmissions.Any()
                ? gradedSubmissions.Average(s => (double)s.Score!.Value / (double)s.Assignment.MaxScore * 100)
                : 0;

            var expectedSubmissions = assignments.Count(a => a.Status == AssignmentStatus.Published) * activeStudents;
            var submissionRate = expectedSubmissions > 0
                ? (double)submissions.Count / expectedSubmissions * 100
                : 0;

            // Exam stats
            var completedExams = examAttempts.Where(ea => ea.SubmittedAt.HasValue && ea.Total > 0).ToList();
            var avgExamScore = completedExams.Any()
                ? completedExams.Average(ea => (double)ea.Score / ea.Total * 100)
                : 0;
            var passRate = completedExams.Any()
                ? (double)completedExams.Count(ea => (double)ea.Score / ea.Total >= 0.6) / completedExams.Count * 100
                : 0;

            // Calculate average grade
            var averageGrade = 0.0;
            if (gradedSubmissions.Any() || completedExams.Any())
            {
                var gradeSum = 0.0;
                var gradeCount = 0;
                if (gradedSubmissions.Any())
                {
                    gradeSum += avgAssignmentScore;
                    gradeCount++;
                }
                if (completedExams.Any())
                {
                    gradeSum += avgExamScore;
                    gradeCount++;
                }
                averageGrade = gradeSum / gradeCount;
            }

            // Calculate engagement for course
            var avgEngagement = await CalculateAverageCourseEngagementAsync(enrollments, lessonProgress, submissions, examAttempts, cancellationToken);

            // Lesson analytics
            var lessonStats = lessons.Select(lesson =>
            {
                var lessonProgressData = lessonProgress.Where(lp => lp.LessonId == lesson.Id).ToList();
                var completedCount = lessonProgressData.Count(lp => lp.IsCompleted);
                var totalViews = lessonProgressData.Count;
                var avgWatchPct = lessonProgressData.Any() && lesson.DurationMinutes.HasValue && lesson.DurationMinutes.Value > 0
                    ? lessonProgressData.Average(lp => (double)lp.WatchedDurationSeconds / (lesson.DurationMinutes!.Value * 60) * 100)
                    : 0.0;

                return new LessonAnalyticsDto
                {
                    LessonId = lesson.Id,
                    LessonTitle = lesson.Title,
                    Order = lesson.Order,
                    TotalViews = totalViews,
                    CompletedCount = completedCount,
                    CompletionRate = totalViews > 0 ? (double)completedCount / totalViews * 100 : 0,
                    AverageWatchPercentage = Math.Round(avgWatchPct, 1),
                    AverageWatchDurationSeconds = (int)(lessonProgressData.Any() ? lessonProgressData.Average(lp => lp.WatchedDurationSeconds) : 0)
                };
            }).ToList();

            // Identify dropoff points
            IdentifyDropoffPoints(lessonStats);

            // Get at-risk students
            var atRiskStudents = new List<StudentAnalyticsDto>();
            foreach (var enrollment in enrollments.Where(e => e.Status == EnrollmentStatus.Active).Take(20))
            {
                var studentAnalyticsResult = await GetStudentAnalyticsAsync(enrollment.UserId, cancellationToken);
                if (studentAnalyticsResult.IsSuccess && studentAnalyticsResult.Value!.RiskLevel >= RiskLevel.Medium)
                {
                    atRiskStudents.Add(studentAnalyticsResult.Value);
                }
            }

            var analytics = new CourseAnalyticsDto
            {
                CourseId = courseId,
                CourseTitle = course.Title,
                InstructorName = course.Instructor?.FullName ?? "Unknown",

                TotalEnrollments = totalEnrollments,
                ActiveStudents = activeStudents,
                CompletedStudents = completedStudents,
                DroppedStudents = droppedStudents,
                CompletionRate = Math.Round(completionRate, 1),
                DropRate = Math.Round(dropRate, 1),

                AverageProgress = Math.Round(averageProgress, 1),
                AverageGrade = Math.Round(averageGrade, 1),
                AverageEngagement = Math.Round(avgEngagement, 1),

                AtRiskStudentCount = atRiskStudents.Count,
                AtRiskStudents = atRiskStudents.OrderByDescending(s => s.RiskScore).ToList(),

                TotalLessons = lessons.Count,
                LessonStats = lessonStats,

                TotalAssignments = assignments.Count,
                AverageAssignmentScore = Math.Round(avgAssignmentScore, 1),
                AssignmentSubmissionRate = Math.Round(Math.Min(100, submissionRate), 1),

                TotalExams = exams.Count,
                AverageExamScore = Math.Round(avgExamScore, 1),
                ExamPassRate = Math.Round(passRate, 1)
            };

            return Result<CourseAnalyticsDto>.Success(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics for course {CourseId}", courseId);
            return Result<CourseAnalyticsDto>.Failure("Failed to get course analytics.");
        }
    }

    public async Task<Result<AnalyticsDashboardDto>> GetDashboardAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);
            var sevenDaysAgo = now.AddDays(-7);
            var oneDayAgo = now.AddDays(-1);

            // Get counts
            var totalStudents = await _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name == "Student" && !ur.IsDeleted)
                .CountAsync(cancellationToken);

            var totalInstructors = await _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name == "Instructor" && !ur.IsDeleted)
                .CountAsync(cancellationToken);

            var totalCourses = await _context.Courses
                .Where(c => !c.IsDeleted && c.Status == CourseStatus.Published)
                .CountAsync(cancellationToken);

            var enrollments = await _context.Enrollments
                .Where(e => !e.IsDeleted)
                .ToListAsync(cancellationToken);

            var totalEnrollments = enrollments.Count;
            var activeEnrollments = enrollments.Count(e => e.Status == EnrollmentStatus.Active);

            // Activity tracking
            var lessonProgress = await _context.LessonProgresses
                .Where(lp => !lp.IsDeleted && lp.LastWatchedAt >= thirtyDaysAgo)
                .ToListAsync(cancellationToken);

            var studentsActiveToday = lessonProgress
                .Where(lp => lp.LastWatchedAt >= oneDayAgo)
                .Select(lp => lp.UserId)
                .Distinct()
                .Count();

            var studentsActiveThisWeek = lessonProgress
                .Where(lp => lp.LastWatchedAt >= sevenDaysAgo)
                .Select(lp => lp.UserId)
                .Distinct()
                .Count();

            var studentsActiveThisMonth = lessonProgress
                .Select(lp => lp.UserId)
                .Distinct()
                .Count();

            // Platform engagement
            var platformEngagement = totalStudents > 0
                ? (double)studentsActiveThisWeek / totalStudents * 100
                : 0;

            // Completion rates
            var completedEnrollments = enrollments.Count(e => e.Status == EnrollmentStatus.Completed);
            var avgCompletion = totalEnrollments > 0
                ? (double)completedEnrollments / totalEnrollments * 100
                : 0;

            // Get student grades
            var submissions = await _context.AssignmentSubmissions
                .Include(s => s.Assignment)
                .Where(s => !s.IsDeleted && s.Score.HasValue)
                .ToListAsync(cancellationToken);

            var avgGrade = submissions.Any()
                ? submissions.Average(s => (double)s.Score!.Value / (double)s.Assignment.MaxScore * 100)
                : 0;

            // At-risk students calculation
            var studentIds = await _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name == "Student" && !ur.IsDeleted)
                .Select(ur => ur.UserId)
                .Take(100) // Limit for performance
                .ToListAsync(cancellationToken);

            var atRiskCounts = new Dictionary<RiskLevel, int>
            {
                { RiskLevel.Low, 0 },
                { RiskLevel.Medium, 0 },
                { RiskLevel.High, 0 },
                { RiskLevel.Critical, 0 }
            };

            var topPerformers = new List<StudentAnalyticsDto>();
            var needsAttention = new List<StudentAnalyticsDto>();

            foreach (var studentId in studentIds)
            {
                var analyticsResult = await GetStudentAnalyticsAsync(studentId, cancellationToken);
                if (analyticsResult.IsSuccess)
                {
                    var analytics = analyticsResult.Value!;
                    atRiskCounts[analytics.RiskLevel]++;

                    if (analytics.EngagementScore >= 80 && analytics.AverageGrade >= 85)
                    {
                        topPerformers.Add(analytics);
                    }
                    else if (analytics.RiskLevel >= RiskLevel.High)
                    {
                        needsAttention.Add(analytics);
                    }
                }
            }

            // Enrollment trend
            var enrollmentTrend = enrollments
                .Where(e => e.EnrolledAt >= thirtyDaysAgo)
                .GroupBy(e => e.EnrolledAt.Date)
                .Select(g => new DailyMetricDto
                {
                    Date = g.Key,
                    Value = g.Count(),
                    Label = g.Key.ToString("MMM dd")
                })
                .OrderBy(x => x.Date)
                .ToList();

            // Activity trend
            var activityTrend = lessonProgress
                .GroupBy(lp => lp.LastWatchedAt.Date)
                .Select(g => new DailyMetricDto
                {
                    Date = g.Key,
                    Value = g.Select(x => x.UserId).Distinct().Count(),
                    Label = g.Key.ToString("MMM dd")
                })
                .OrderBy(x => x.Date)
                .ToList();

            // Course rankings
            var courses = await _context.Courses
                .Include(c => c.Instructor)
                .Where(c => !c.IsDeleted && c.Status == CourseStatus.Published)
                .ToListAsync(cancellationToken);

            var topRated = courses
                .OrderByDescending(c => c.Rating)
                .Take(5)
                .Select((c, i) => new CourseRankingDto
                {
                    CourseId = c.Id,
                    Title = c.Title,
                    InstructorName = c.Instructor?.FullName ?? "Unknown",
                    ThumbnailUrl = c.ThumbnailUrl,
                    MetricValue = (double)c.Rating,
                    MetricLabel = $"{c.Rating:F1} ({c.RatingCount} reviews)",
                    Rank = i + 1
                })
                .ToList();

            var courseEnrollmentCounts = enrollments
                .GroupBy(e => e.CourseId)
                .ToDictionary(g => g.Key, g => g.Count());

            var mostEnrolled = courses
                .Select(c => new { Course = c, Count = courseEnrollmentCounts.GetValueOrDefault(c.Id, 0) })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .Select((x, i) => new CourseRankingDto
                {
                    CourseId = x.Course.Id,
                    Title = x.Course.Title,
                    InstructorName = x.Course.Instructor?.FullName ?? "Unknown",
                    ThumbnailUrl = x.Course.ThumbnailUrl,
                    MetricValue = x.Count,
                    MetricLabel = $"{x.Count} students",
                    Rank = i + 1
                })
                .ToList();

            var dashboard = new AnalyticsDashboardDto
            {
                TotalStudents = totalStudents,
                TotalInstructors = totalInstructors,
                TotalCourses = totalCourses,
                TotalEnrollments = totalEnrollments,
                ActiveEnrollments = activeEnrollments,

                PlatformEngagementScore = Math.Round(platformEngagement, 1),
                StudentsActiveToday = studentsActiveToday,
                StudentsActiveThisWeek = studentsActiveThisWeek,
                StudentsActiveThisMonth = studentsActiveThisMonth,

                AtRiskStudentCount = atRiskCounts[RiskLevel.Medium] + atRiskCounts[RiskLevel.High] + atRiskCounts[RiskLevel.Critical],
                CriticalRiskCount = atRiskCounts[RiskLevel.Critical],
                HighRiskCount = atRiskCounts[RiskLevel.High],
                MediumRiskCount = atRiskCounts[RiskLevel.Medium],

                AverageCourseCompletion = Math.Round(avgCompletion, 1),
                AverageStudentGrade = Math.Round(avgGrade, 1),

                EnrollmentTrend = enrollmentTrend,
                ActivityTrend = activityTrend,
                CompletionTrend = new List<DailyMetricDto>(), // Would need historical data

                TopPerformers = topPerformers.OrderByDescending(s => s.AverageGrade).Take(5).ToList(),
                NeedsAttention = needsAttention.OrderByDescending(s => s.RiskScore).Take(10).ToList(),

                TopRatedCourses = topRated,
                MostEnrolledCourses = mostEnrolled,
                HighestCompletionCourses = new List<CourseRankingDto>() // Would need completion data per course
            };

            return Result<AnalyticsDashboardDto>.Success(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard analytics");
            return Result<AnalyticsDashboardDto>.Failure("Failed to get dashboard analytics.");
        }
    }

    public async Task<Result<List<StudentAnalyticsDto>>> GetAtRiskStudentsAsync(RiskLevel? minimumRisk = null, int limit = 50, CancellationToken cancellationToken = default)
    {
        try
        {
            var minRisk = minimumRisk ?? RiskLevel.Medium;

            var studentIds = await _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name == "Student" && !ur.IsDeleted)
                .Select(ur => ur.UserId)
                .Take(limit * 2) // Get more to filter
                .ToListAsync(cancellationToken);

            var atRiskStudents = new List<StudentAnalyticsDto>();

            foreach (var studentId in studentIds)
            {
                var analyticsResult = await GetStudentAnalyticsAsync(studentId, cancellationToken);
                if (analyticsResult.IsSuccess && analyticsResult.Value!.RiskLevel >= minRisk)
                {
                    atRiskStudents.Add(analyticsResult.Value);
                }

                if (atRiskStudents.Count >= limit)
                    break;
            }

            return Result<List<StudentAnalyticsDto>>.Success(
                atRiskStudents.OrderByDescending(s => s.RiskScore).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting at-risk students");
            return Result<List<StudentAnalyticsDto>>.Failure("Failed to get at-risk students.");
        }
    }

    public async Task<Result<List<StudentAnalyticsDto>>> GetCourseAtRiskStudentsAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        try
        {
            var enrollments = await _context.Enrollments
                .Where(e => e.CourseId == courseId && !e.IsDeleted && e.Status == EnrollmentStatus.Active)
                .Select(e => e.UserId)
                .ToListAsync(cancellationToken);

            var atRiskStudents = new List<StudentAnalyticsDto>();

            foreach (var studentId in enrollments)
            {
                var analyticsResult = await GetStudentAnalyticsAsync(studentId, cancellationToken);
                if (analyticsResult.IsSuccess && analyticsResult.Value!.RiskLevel >= RiskLevel.Medium)
                {
                    atRiskStudents.Add(analyticsResult.Value);
                }
            }

            return Result<List<StudentAnalyticsDto>>.Success(
                atRiskStudents.OrderByDescending(s => s.RiskScore).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting at-risk students for course {CourseId}", courseId);
            return Result<List<StudentAnalyticsDto>>.Failure("Failed to get at-risk students.");
        }
    }

    public async Task<Result<InstructorAnalyticsDto>> GetInstructorAnalyticsAsync(Guid instructorId, CancellationToken cancellationToken = default)
    {
        try
        {
            var instructor = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == instructorId && !u.IsDeleted, cancellationToken);

            if (instructor == null)
            {
                return Result<InstructorAnalyticsDto>.Failure("Instructor not found.");
            }

            var courses = await _context.Courses
                .Where(c => c.InstructorId == instructorId && !c.IsDeleted)
                .ToListAsync(cancellationToken);

            var courseIds = courses.Select(c => c.Id).ToList();

            var enrollments = await _context.Enrollments
                .Where(e => courseIds.Contains(e.CourseId) && !e.IsDeleted)
                .ToListAsync(cancellationToken);

            var reviews = await _context.Reviews
                .Where(r => courseIds.Contains(r.CourseId) && !r.IsDeleted && r.IsVisible)
                .ToListAsync(cancellationToken);

            var totalStudents = enrollments.Select(e => e.UserId).Distinct().Count();
            var activeStudents = enrollments.Where(e => e.Status == EnrollmentStatus.Active).Select(e => e.UserId).Distinct().Count();
            var avgRating = reviews.Any() ? reviews.Average(r => r.Rating) : 0;

            var completedEnrollments = enrollments.Count(e => e.Status == EnrollmentStatus.Completed);
            var avgCompletion = enrollments.Any()
                ? (double)completedEnrollments / enrollments.Count * 100
                : 0;

            // Get course analytics
            var courseAnalytics = new List<CourseAnalyticsDto>();
            foreach (var course in courses.Take(10)) // Limit for performance
            {
                var result = await GetCourseAnalyticsAsync(course.Id, cancellationToken);
                if (result.IsSuccess)
                {
                    courseAnalytics.Add(result.Value!);
                }
            }

            var avgStudentGrade = courseAnalytics.Any()
                ? courseAnalytics.Average(c => c.AverageGrade)
                : 0;

            var analytics = new InstructorAnalyticsDto
            {
                InstructorId = instructorId,
                InstructorName = instructor.FullName,
                ProfilePictureUrl = instructor.ProfilePictureUrl,
                TotalCourses = courses.Count,
                PublishedCourses = courses.Count(c => c.Status == CourseStatus.Published),
                TotalStudents = totalStudents,
                ActiveStudents = activeStudents,
                AverageRating = Math.Round(avgRating, 1),
                TotalReviews = reviews.Count,
                AverageCompletionRate = Math.Round(avgCompletion, 1),
                AverageStudentGrade = Math.Round(avgStudentGrade, 1),
                CourseAnalytics = courseAnalytics
            };

            return Result<InstructorAnalyticsDto>.Success(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics for instructor {InstructorId}", instructorId);
            return Result<InstructorAnalyticsDto>.Failure("Failed to get instructor analytics.");
        }
    }

    public async Task<Result<List<LessonAnalyticsDto>>> GetLessonAnalyticsAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        try
        {
            var courseResult = await GetCourseAnalyticsAsync(courseId, cancellationToken);
            if (!courseResult.IsSuccess)
            {
                return Result<List<LessonAnalyticsDto>>.Failure(courseResult.Error!);
            }

            return Result<List<LessonAnalyticsDto>>.Success(courseResult.Value!.LessonStats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lesson analytics for course {CourseId}", courseId);
            return Result<List<LessonAnalyticsDto>>.Failure("Failed to get lesson analytics.");
        }
    }

    public async Task<Result<double>> PredictStudentGradeAsync(Guid studentId, Guid courseId, CancellationToken cancellationToken = default)
    {
        try
        {
            var analyticsResult = await GetStudentAnalyticsAsync(studentId, cancellationToken);
            if (!analyticsResult.IsSuccess)
            {
                return Result<double>.Failure(analyticsResult.Error!);
            }

            return Result<double>.Success(analyticsResult.Value!.PredictedFinalGrade);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error predicting grade for student {StudentId} in course {CourseId}", studentId, courseId);
            return Result<double>.Failure("Failed to predict grade.");
        }
    }

    #region Private Helper Methods

    private double CalculateEngagementScore(
        List<Enrollment> enrollments,
        List<LessonProgress> lessonProgress,
        List<AssignmentSubmission> submissions,
        List<ExamAttempt> examAttempts,
        int daysSinceLastActivity)
    {
        double score = 0;

        // Activity recency (30 points max)
        if (daysSinceLastActivity <= 1) score += 30;
        else if (daysSinceLastActivity <= 3) score += 25;
        else if (daysSinceLastActivity <= 7) score += 20;
        else if (daysSinceLastActivity <= 14) score += 10;
        else if (daysSinceLastActivity <= 30) score += 5;

        // Lesson completion rate (25 points max)
        if (lessonProgress.Any())
        {
            var completionRate = (double)lessonProgress.Count(lp => lp.IsCompleted) / lessonProgress.Count;
            score += completionRate * 25;
        }

        // Assignment submission rate (25 points max)
        if (enrollments.Any())
        {
            var activeEnrollments = enrollments.Count(e => e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed);
            if (activeEnrollments > 0 && submissions.Any())
            {
                // Rough estimate - submissions per enrollment
                var submissionsPerEnrollment = (double)submissions.Count / activeEnrollments;
                score += Math.Min(25, submissionsPerEnrollment * 5);
            }
        }

        // Exam participation (20 points max)
        if (examAttempts.Any())
        {
            var completedExams = examAttempts.Count(ea => ea.SubmittedAt.HasValue);
            score += Math.Min(20, completedExams * 4);
        }

        return Math.Min(100, score);
    }

    private (double riskScore, List<string> riskFactors) CalculateRiskScore(
        List<Enrollment> enrollments,
        double averageGrade,
        int daysSinceLastActivity,
        double engagementScore,
        int droppedCourses)
    {
        var riskScore = 0.0;
        var factors = new List<string>();

        // Inactivity risk (40 points max)
        if (daysSinceLastActivity >= DaysInactiveCritical)
        {
            riskScore += 40;
            factors.Add($"No activity for {daysSinceLastActivity} days");
        }
        else if (daysSinceLastActivity >= DaysInactiveWarning)
        {
            riskScore += 25;
            factors.Add($"Low activity - {daysSinceLastActivity} days since last login");
        }

        // Low engagement risk (25 points max)
        if (engagementScore < 20)
        {
            riskScore += 25;
            factors.Add("Very low engagement score");
        }
        else if (engagementScore < 40)
        {
            riskScore += 15;
            factors.Add("Below average engagement");
        }

        // Low grade risk (20 points max)
        if (averageGrade > 0 && averageGrade < LowGradeThreshold)
        {
            riskScore += 20;
            factors.Add($"Low average grade ({averageGrade:F0}%)");
        }
        else if (averageGrade > 0 && averageGrade < 70)
        {
            riskScore += 10;
            factors.Add("Below average performance");
        }

        // Drop history risk (15 points max)
        if (droppedCourses >= 2)
        {
            riskScore += 15;
            factors.Add($"Has dropped {droppedCourses} courses");
        }
        else if (droppedCourses == 1)
        {
            riskScore += 5;
            factors.Add("Has dropped 1 course");
        }

        // Low progress on active courses
        var activeEnrollments = enrollments.Where(e => e.Status == EnrollmentStatus.Active).ToList();
        if (activeEnrollments.Any())
        {
            var avgProgress = activeEnrollments.Average(e => (double)e.ProgressPercentage);
            if (avgProgress < LowProgressThreshold)
            {
                riskScore += 10;
                factors.Add($"Low course progress ({avgProgress:F0}%)");
            }
        }

        return (Math.Min(100, riskScore), factors);
    }

    private double PredictFinalGrade(double currentGrade, double engagement, double completionRate)
    {
        // Simple weighted prediction model
        // In a real system, this would use ML.NET with trained models

        if (currentGrade == 0)
        {
            // No grades yet - predict based on engagement
            return 50 + (engagement / 2);
        }

        // Weight: 60% current grade, 25% engagement factor, 15% completion trend
        var engagementFactor = engagement / 100 * 20 - 10; // -10 to +10 adjustment
        var completionFactor = completionRate / 100 * 10 - 5; // -5 to +5 adjustment

        var predicted = currentGrade + engagementFactor + completionFactor;

        // Clamp to valid range
        return Math.Max(0, Math.Min(100, predicted));
    }

    private List<string> GenerateStudentRecommendations(List<string> riskFactors, double engagement, double grade)
    {
        var recommendations = new List<string>();

        if (riskFactors.Any(f => f.Contains("activity") || f.Contains("days")))
        {
            recommendations.Add("Encourage regular platform engagement with reminders");
        }

        if (engagement < 40)
        {
            recommendations.Add("Schedule check-in meeting to discuss course progress");
            recommendations.Add("Consider peer study group assignment");
        }

        if (grade > 0 && grade < 70)
        {
            recommendations.Add("Recommend tutoring or office hours");
            recommendations.Add("Review past assignments for improvement areas");
        }

        if (riskFactors.Any(f => f.Contains("dropped")))
        {
            recommendations.Add("Discuss course load and time management");
        }

        if (!recommendations.Any())
        {
            recommendations.Add("Student is performing well - continue monitoring");
        }

        return recommendations;
    }

    private static EngagementLevel GetEngagementLevel(double score) => score switch
    {
        >= 81 => EngagementLevel.VeryHigh,
        >= 61 => EngagementLevel.High,
        >= 41 => EngagementLevel.Medium,
        >= 21 => EngagementLevel.Low,
        _ => EngagementLevel.VeryLow
    };

    private static RiskLevel GetRiskLevel(double score) => score switch
    {
        >= 76 => RiskLevel.Critical,
        >= 51 => RiskLevel.High,
        >= 26 => RiskLevel.Medium,
        _ => RiskLevel.Low
    };

    private async Task<double> CalculateAverageCourseEngagementAsync(
        List<Enrollment> enrollments,
        List<LessonProgress> lessonProgress,
        List<AssignmentSubmission> submissions,
        List<ExamAttempt> examAttempts,
        CancellationToken cancellationToken)
    {
        if (!enrollments.Any())
            return 0;

        var studentIds = enrollments.Select(e => e.UserId).Distinct().ToList();
        double totalEngagement = 0;

        foreach (var studentId in studentIds.Take(50)) // Limit for performance
        {
            var studentLessons = lessonProgress.Where(lp => lp.UserId == studentId).ToList();
            var studentSubmissions = submissions.Where(s => s.UserId == studentId).ToList();
            var studentExams = examAttempts.Where(ea => ea.UserId == studentId).ToList();
            var studentEnrollments = enrollments.Where(e => e.UserId == studentId).ToList();

            var lastActivity = studentLessons.MaxBy(lp => lp.LastWatchedAt)?.LastWatchedAt;
            var daysSince = lastActivity.HasValue ? (int)(DateTime.UtcNow - lastActivity.Value).TotalDays : 30;

            var engagement = CalculateEngagementScore(studentEnrollments, studentLessons, studentSubmissions, studentExams, daysSince);
            totalEngagement += engagement;
        }

        return totalEngagement / Math.Min(studentIds.Count, 50);
    }

    private void IdentifyDropoffPoints(List<LessonAnalyticsDto> lessonStats)
    {
        if (lessonStats.Count < 2)
            return;

        for (int i = 1; i < lessonStats.Count; i++)
        {
            var current = lessonStats[i];
            var previous = lessonStats[i - 1];

            if (previous.CompletedCount > 0)
            {
                var dropoff = 1 - ((double)current.CompletedCount / previous.CompletedCount);
                current.DropoffRate = Math.Round(dropoff * 100, 1);
                current.IsDropoffPoint = dropoff > 0.3; // 30% dropoff threshold
            }
        }
    }

    #endregion
}
