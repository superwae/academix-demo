using AcademixLMS.Application.Common;
using AcademixLMS.Application.DTOs.Course;
using AcademixLMS.Application.Interfaces;
using AcademixLMS.Domain.Common;
using AcademixLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcademixLMS.Application.Services;

public class CourseService : ICourseService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CourseService> _logger;

    public CourseService(
        IApplicationDbContext context,
        ILogger<CourseService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<CourseDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<CourseDto>.Failure("Course not found.");
        }

        var sectionIds = course.Sections.Where(s => !s.IsDeleted).Select(s => s.Id).ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(sectionIds, cancellationToken);
        var courseDto = MapToCourseDto(course, enrollmentCounts);
        return Result<CourseDto>.Success(courseDto);
    }

    public async Task<Result<PagedResult<CourseDto>>> GetPagedAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .Where(c => !c.IsDeleted)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(c =>
                c.Title.ToLower().Contains(searchTerm) ||
                c.Description.ToLower().Contains(searchTerm) ||
                c.Category.ToLower().Contains(searchTerm));
        }

        // Status filter (only show Published courses in public listings)
        // This can be overridden by Admin/Instructor in specific endpoints
        query = query.Where(c => c.Status == CourseStatus.Published);

        // Sorting
        query = request.SortBy?.ToLower() switch
        {
            "title" => request.SortDescending
                ? query.OrderByDescending(c => c.Title)
                : query.OrderBy(c => c.Title),
            "rating" => request.SortDescending
                ? query.OrderByDescending(c => c.Rating)
                : query.OrderBy(c => c.Rating),
            "created" => request.SortDescending
                ? query.OrderByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.CreatedAt),
            _ => query.OrderByDescending(c => c.IsFeatured).ThenByDescending(c => c.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var courses = await query
            .Skip(skip)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var allSectionIds = courses.SelectMany(c => c.Sections.Where(s => !s.IsDeleted).Select(s => s.Id)).Distinct().ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(allSectionIds, cancellationToken);
        var courseDtos = courses.Select(c => MapToCourseDto(c, enrollmentCounts)).ToList();

        return Result<PagedResult<CourseDto>>.Success(new PagedResult<CourseDto>
        {
            Items = courseDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<PagedResult<CourseDto>>> GetByCategoryAsync(string category, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .Where(c => !c.IsDeleted && c.Category == category && c.Status == CourseStatus.Published)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(c =>
                c.Title.ToLower().Contains(searchTerm) ||
                c.Description.ToLower().Contains(searchTerm));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var courses = await query
            .Skip(skip)
            .Take(request.PageSize)
            .OrderByDescending(c => c.IsFeatured)
            .ThenByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var allSectionIds = courses.SelectMany(c => c.Sections.Where(s => !s.IsDeleted).Select(s => s.Id)).Distinct().ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(allSectionIds, cancellationToken);
        var courseDtos = courses.Select(c => MapToCourseDto(c, enrollmentCounts)).ToList();

        return Result<PagedResult<CourseDto>>.Success(new PagedResult<CourseDto>
        {
            Items = courseDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<PagedResult<CourseDto>>> GetByInstructorAsync(Guid instructorId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .Where(c => !c.IsDeleted && c.InstructorId == instructorId)
            .AsQueryable();

        // Instructors can see all their courses (including Draft)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(c =>
                c.Title.ToLower().Contains(searchTerm) ||
                c.Description.ToLower().Contains(searchTerm));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var skip = (request.PageNumber - 1) * request.PageSize;
        var courses = await query
            .Skip(skip)
            .Take(request.PageSize)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var allSectionIds = courses.SelectMany(c => c.Sections.Where(s => !s.IsDeleted).Select(s => s.Id)).Distinct().ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(allSectionIds, cancellationToken);
        var courseDtos = courses.Select(c => MapToCourseDto(c, enrollmentCounts)).ToList();

        return Result<PagedResult<CourseDto>>.Success(new PagedResult<CourseDto>
        {
            Items = courseDtos,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    public async Task<Result<List<CourseDto>>> GetFeaturedAsync(CancellationToken cancellationToken = default)
    {
        var courses = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .Where(c => !c.IsDeleted && c.IsFeatured && c.Status == CourseStatus.Published)
            .OrderByDescending(c => c.Rating)
            .ThenByDescending(c => c.CreatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        var allSectionIds = courses.SelectMany(c => c.Sections.Where(s => !s.IsDeleted).Select(s => s.Id)).Distinct().ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(allSectionIds, cancellationToken);
        var courseDtos = courses.Select(c => MapToCourseDto(c, enrollmentCounts)).ToList();

        return Result<List<CourseDto>>.Success(courseDtos);
    }

    public async Task<Result<CourseDto>> CreateAsync(CreateCourseRequest request, CancellationToken cancellationToken = default)
    {
        // Validate instructor exists
        var instructor = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.InstructorId && !u.IsDeleted, cancellationToken);

        if (instructor == null)
        {
            return Result<CourseDto>.Failure("Instructor not found.");
        }

        // Parse enums
        if (!Enum.TryParse<CourseLevel>(request.Level, true, out var level))
        {
            return Result<CourseDto>.Failure("Invalid course level.");
        }

        if (!Enum.TryParse<Modality>(request.Modality, true, out var modality))
        {
            return Result<CourseDto>.Failure("Invalid modality.");
        }

        if (!Enum.TryParse<ProviderType>(request.ProviderType, true, out var providerType))
        {
            return Result<CourseDto>.Failure("Invalid provider type.");
        }

        if (request.Sections.Count > 0)
        {
            var allSlots = new List<MeetingSlot>();
            foreach (var sectionRequest in request.Sections)
                allSlots.AddRange(ParseMeetingSlots(sectionRequest.MeetingTimes));

            var scheduleError = await ValidateInstructorScheduleNoOverlapAsync(
                request.InstructorId, allSlots, excludeSectionId: null, cancellationToken);
            if (scheduleError != null)
                return Result<CourseDto>.Failure(scheduleError);
        }

        if (request.ExpectedDurationHours.HasValue && request.ExpectedDurationHours.Value < 0)
        {
            return Result<CourseDto>.Failure("Expected duration hours cannot be negative.");
        }

        if (request.CourseStartDate.HasValue && request.CourseEndDate.HasValue &&
            NormalizeUtcDateOnly(request.CourseEndDate) < NormalizeUtcDateOnly(request.CourseStartDate))
        {
            return Result<CourseDto>.Failure("Course end date must be on or after start date.");
        }

        if (request.Certificate != null)
        {
            if (CertificateSummaryHelper.ExceedsMaxWords(request.Certificate.Summary))
            {
                return Result<CourseDto>.Failure(
                    $"Certificate summary must be at most {CertificateSummaryHelper.MaxWords} words.");
            }

            if (request.Certificate.DisplayHours.HasValue && request.Certificate.DisplayHours.Value < 0)
                return Result<CourseDto>.Failure("Certificate display hours cannot be negative.");
        }

        var cert = request.Certificate ?? new CertificateSettingsDto();

        // Create course (always starts as Draft)
        var course = new Course
        {
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            Level = level,
            Modality = modality,
            ProviderType = providerType,
            ProviderName = request.ProviderName,
            InstructorId = request.InstructorId,
            Price = request.Price,
            ThumbnailUrl = request.ThumbnailUrl,
            ExpectedDurationHours = request.ExpectedDurationHours,
            CourseStartDate = NormalizeUtcDateOnly(request.CourseStartDate),
            CourseEndDate = NormalizeUtcDateOnly(request.CourseEndDate),
            Status = CourseStatus.Draft, // Always starts as Draft
            IsFeatured = false,
            CreatedAt = DateTime.UtcNow,
            IssueCertificates = cert.IssueCertificates,
            CertificateSummary = CertificateSummaryHelper.Normalize(cert.Summary),
            CertificateDisplayHours = cert.DisplayHours
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync(cancellationToken);

        // Add tags
        if (request.Tags.Any())
        {
            foreach (var tagName in request.Tags.Distinct())
            {
                var tag = await _context.Tags
                    .FirstOrDefaultAsync(t => t.Name == tagName && !t.IsDeleted, cancellationToken);

                if (tag == null)
                {
                    tag = new Tag { Name = tagName, CreatedAt = DateTime.UtcNow };
                    _context.Tags.Add(tag);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                var courseTag = new CourseTag
                {
                    CourseId = course.Id,
                    TagId = tag.Id
                };
                _context.CourseTags.Add(courseTag);
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Add sections
        if (request.Sections.Any())
        {
            foreach (var sectionRequest in request.Sections)
            {
                var section = new CourseSection
                {
                    CourseId = course.Id,
                    Name = sectionRequest.Name,
                    LocationLabel = sectionRequest.LocationLabel,
                    JoinUrl = sectionRequest.JoinUrl,
                    MaxSeats = sectionRequest.MaxSeats,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.CourseSections.Add(section);
                await _context.SaveChangesAsync(cancellationToken);

                // Add meeting times
                foreach (var meetingTimeRequest in sectionRequest.MeetingTimes)
                {
                    if (!Enum.TryParse<Domain.Common.DayOfWeek>(meetingTimeRequest.Day, true, out var day))
                        continue;

                    var meetingTime = new SectionMeetingTime
                    {
                        SectionId = section.Id,
                        Day = day,
                        StartMinutes = meetingTimeRequest.StartMinutes,
                        EndMinutes = meetingTimeRequest.EndMinutes,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.SectionMeetingTimes.Add(meetingTime);
                }
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Reload with all relations
        var createdCourse = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .FirstAsync(c => c.Id == course.Id, cancellationToken);

        var sectionIds = createdCourse.Sections.Where(s => !s.IsDeleted).Select(s => s.Id).ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(sectionIds, cancellationToken);
        var courseDto = MapToCourseDto(createdCourse, enrollmentCounts);
        return Result<CourseDto>.Success(courseDto);
    }

    public async Task<Result<CourseDto>> UpdateAsync(Guid id, UpdateCourseRequest request, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<CourseDto>.Failure("Course not found.");
        }

        // Ownership check: Instructor can only update their own courses (unless Admin)
        if (!isAdmin && currentUserId.HasValue && course.InstructorId != currentUserId.Value)
        {
            return Result<CourseDto>.Failure("You can only update courses you own.");
        }

        // Update fields if provided
        if (!string.IsNullOrWhiteSpace(request.Title))
            course.Title = request.Title;

        if (!string.IsNullOrWhiteSpace(request.Description))
            course.Description = request.Description;

        if (!string.IsNullOrWhiteSpace(request.Category))
            course.Category = request.Category;

        if (!string.IsNullOrWhiteSpace(request.Level) && Enum.TryParse<CourseLevel>(request.Level, true, out var level))
            course.Level = level;

        if (!string.IsNullOrWhiteSpace(request.Modality) && Enum.TryParse<Modality>(request.Modality, true, out var modality))
            course.Modality = modality;

        if (!string.IsNullOrWhiteSpace(request.ProviderType) && Enum.TryParse<ProviderType>(request.ProviderType, true, out var providerType))
            course.ProviderType = providerType;

        if (!string.IsNullOrWhiteSpace(request.ProviderName))
            course.ProviderName = request.ProviderName;

        if (request.InstructorId.HasValue)
        {
            var instructor = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.InstructorId.Value && !u.IsDeleted, cancellationToken);

            if (instructor == null)
            {
                return Result<CourseDto>.Failure("Instructor not found.");
            }

            course.InstructorId = request.InstructorId.Value;
        }

        if (request.Price.HasValue)
            course.Price = request.Price;

        if (request.ThumbnailUrl != null)
            course.ThumbnailUrl = request.ThumbnailUrl;

        if (request.ExpectedDurationHours.HasValue)
        {
            if (request.ExpectedDurationHours.Value < 0)
                return Result<CourseDto>.Failure("Expected duration hours cannot be negative.");
            course.ExpectedDurationHours = request.ExpectedDurationHours.Value;
        }

        if (request.CourseStartDate.HasValue)
            course.CourseStartDate = NormalizeUtcDateOnly(request.CourseStartDate);

        if (request.CourseEndDate.HasValue)
            course.CourseEndDate = NormalizeUtcDateOnly(request.CourseEndDate);

        if (course.CourseStartDate.HasValue && course.CourseEndDate.HasValue &&
            course.CourseEndDate < course.CourseStartDate)
        {
            return Result<CourseDto>.Failure("Course end date must be on or after start date.");
        }

        if (request.Certificate != null)
        {
            if (CertificateSummaryHelper.ExceedsMaxWords(request.Certificate.Summary))
            {
                return Result<CourseDto>.Failure(
                    $"Certificate summary must be at most {CertificateSummaryHelper.MaxWords} words.");
            }

            if (request.Certificate.DisplayHours.HasValue && request.Certificate.DisplayHours.Value < 0)
                return Result<CourseDto>.Failure("Certificate display hours cannot be negative.");

            course.IssueCertificates = request.Certificate.IssueCertificates;
            course.CertificateSummary = CertificateSummaryHelper.Normalize(request.Certificate.Summary);
            course.CertificateDisplayHours = request.Certificate.DisplayHours;
        }

        // Only Admin can change IsFeatured
        if (request.IsFeatured.HasValue)
            course.IsFeatured = request.IsFeatured.Value;

        // Status changes should use PublishAsync/ArchiveAsync methods
        // But allow direct status change for Admin flexibility
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<CourseStatus>(request.Status, true, out var status))
        {
            course.Status = status;
        }

        // Update tags
        if (request.Tags != null)
        {
            // Remove existing tags
            var existingCourseTags = course.CourseTags.Where(ct => !ct.IsDeleted).ToList();
            foreach (var courseTag in existingCourseTags)
            {
                courseTag.IsDeleted = true;
                courseTag.DeletedAt = DateTime.UtcNow;
            }

            // Add new tags
            foreach (var tagName in request.Tags.Distinct())
            {
                var tag = await _context.Tags
                    .FirstOrDefaultAsync(t => t.Name == tagName && !t.IsDeleted, cancellationToken);

                if (tag == null)
                {
                    tag = new Tag { Name = tagName, CreatedAt = DateTime.UtcNow };
                    _context.Tags.Add(tag);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                var courseTag = new CourseTag
                {
                    CourseId = course.Id,
                    TagId = tag.Id
                };
                _context.CourseTags.Add(courseTag);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload
        var updatedCourse = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .FirstAsync(c => c.Id == course.Id, cancellationToken);

        var sectionIds = updatedCourse.Sections.Where(s => !s.IsDeleted).Select(s => s.Id).ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(sectionIds, cancellationToken);
        var courseDto = MapToCourseDto(updatedCourse, enrollmentCounts);
        return Result<CourseDto>.Success(courseDto);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result.Failure("Course not found.");
        }

        // Check if course has active enrollments
        var hasActiveEnrollments = await _context.Enrollments
            .AnyAsync(e => e.CourseId == id && !e.IsDeleted && e.Status == EnrollmentStatus.Active, cancellationToken);

        if (hasActiveEnrollments)
        {
            return Result.Failure("Cannot delete course with active enrollments. Archive it instead.");
        }

        // Soft delete
        course.IsDeleted = true;
        course.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> PublishAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .Include(c => c.Sections)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result.Failure("Course not found.");
        }

        // Validate state transition
        if (course.Status == CourseStatus.Published)
        {
            return Result.Failure("Course is already published.");
        }

        if (course.Status == CourseStatus.Archived)
        {
            return Result.Failure("Cannot publish an archived course. Please unarchive it first.");
        }

        // Validation rules for publishing
        var validationErrors = new List<string>();

        if (string.IsNullOrWhiteSpace(course.Title))
            validationErrors.Add("Course title is required.");

        if (string.IsNullOrWhiteSpace(course.Description))
            validationErrors.Add("Course description is required.");

        if (string.IsNullOrWhiteSpace(course.Category))
            validationErrors.Add("Course category is required.");

        if (!course.Sections.Any(s => !s.IsDeleted && s.IsActive))
            validationErrors.Add("Course must have at least one active section.");

        if (validationErrors.Any())
        {
            return Result.Failure($"Cannot publish course. {string.Join(" ", validationErrors)}");
        }

        // Transition to Published
        course.Status = CourseStatus.Published;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Course {CourseId} published successfully.", id);

        return Result.Success();
    }

    public async Task<Result> ArchiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result.Failure("Course not found.");
        }

        if (course.Status == CourseStatus.Archived)
        {
            return Result.Failure("Course is already archived.");
        }

        // Transition to Archived
        course.Status = CourseStatus.Archived;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Course {CourseId} archived successfully.", id);

        return Result.Success();
    }

    public async Task<Result<CourseSectionDto>> AddSectionAsync(Guid courseId, CreateSectionRequest request, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result<CourseSectionDto>.Failure("Course not found.");
        }

        // Ownership check: Instructor can only manage sections of their own courses (unless Admin)
        if (!isAdmin && currentUserId.HasValue && course.InstructorId != currentUserId.Value)
        {
            return Result<CourseSectionDto>.Failure("You can only manage sections of courses you own.");
        }

        var proposedSlots = ParseMeetingSlots(request.MeetingTimes);
        var scheduleError = await ValidateInstructorScheduleNoOverlapAsync(
            course.InstructorId, proposedSlots, excludeSectionId: null, cancellationToken);
        if (scheduleError != null)
            return Result<CourseSectionDto>.Failure(scheduleError);

        var section = new CourseSection
        {
            CourseId = courseId,
            Name = request.Name,
            LocationLabel = request.LocationLabel,
            JoinUrl = request.JoinUrl,
            MaxSeats = request.MaxSeats,
            SeatsRemaining = request.MaxSeats,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.CourseSections.Add(section);
        await _context.SaveChangesAsync(cancellationToken);

        // Add meeting times
        foreach (var meetingTimeRequest in request.MeetingTimes)
        {
            if (!Enum.TryParse<Domain.Common.DayOfWeek>(meetingTimeRequest.Day, true, out var day))
                continue;

            var meetingTime = new SectionMeetingTime
            {
                SectionId = section.Id,
                Day = day,
                StartMinutes = meetingTimeRequest.StartMinutes,
                EndMinutes = meetingTimeRequest.EndMinutes,
                CreatedAt = DateTime.UtcNow
            };

            _context.SectionMeetingTimes.Add(meetingTime);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload with meeting times
        var createdSection = await _context.CourseSections
            .Include(s => s.MeetingTimes)
            .FirstAsync(s => s.Id == section.Id, cancellationToken);

        var sectionDto = MapToCourseSectionDto(createdSection);
        return Result<CourseSectionDto>.Success(sectionDto);
    }

    public async Task<Result> UpdateSectionAsync(Guid courseId, Guid sectionId, CreateSectionRequest request, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result.Failure("Course not found.");
        }

        // Ownership check: Instructor can only manage sections of their own courses (unless Admin)
        if (!isAdmin && currentUserId.HasValue && course.InstructorId != currentUserId.Value)
        {
            return Result.Failure("You can only manage sections of courses you own.");
        }

        var section = await _context.CourseSections
            .Include(s => s.MeetingTimes)
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.CourseId == courseId && !s.IsDeleted, cancellationToken);

        if (section == null)
        {
            return Result.Failure("Section not found.");
        }

        var proposedSlots = ParseMeetingSlots(request.MeetingTimes);
        var scheduleError = await ValidateInstructorScheduleNoOverlapAsync(
            course.InstructorId, proposedSlots, excludeSectionId: sectionId, cancellationToken);
        if (scheduleError != null)
            return Result.Failure(scheduleError);

        section.Name = request.Name;
        section.LocationLabel = request.LocationLabel;
        section.JoinUrl = request.JoinUrl;
        section.MaxSeats = request.MaxSeats;

        // Update meeting times (remove old, add new)
        foreach (var meetingTime in section.MeetingTimes.Where(mt => !mt.IsDeleted))
        {
            meetingTime.IsDeleted = true;
            meetingTime.DeletedAt = DateTime.UtcNow;
        }

        foreach (var meetingTimeRequest in request.MeetingTimes)
        {
            if (!Enum.TryParse<Domain.Common.DayOfWeek>(meetingTimeRequest.Day, true, out var day))
                continue;

            var meetingTime = new SectionMeetingTime
            {
                SectionId = section.Id,
                Day = day,
                StartMinutes = meetingTimeRequest.StartMinutes,
                EndMinutes = meetingTimeRequest.EndMinutes,
                CreatedAt = DateTime.UtcNow
            };

            _context.SectionMeetingTimes.Add(meetingTime);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteSectionAsync(Guid courseId, Guid sectionId, Guid? currentUserId = null, bool isAdmin = false, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (course == null)
        {
            return Result.Failure("Course not found.");
        }

        // Ownership check: Instructor can only manage sections of their own courses (unless Admin)
        if (!isAdmin && currentUserId.HasValue && course.InstructorId != currentUserId.Value)
        {
            return Result.Failure("You can only manage sections of courses you own.");
        }

        var section = await _context.CourseSections
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.CourseId == courseId && !s.IsDeleted, cancellationToken);

        if (section == null)
        {
            return Result.Failure("Section not found.");
        }

        // Check if section has active enrollments
        var hasEnrollments = await _context.Enrollments
            .AnyAsync(e => e.SectionId == sectionId && !e.IsDeleted, cancellationToken);

        if (hasEnrollments)
        {
            return Result.Failure("Cannot delete section with enrollments. Deactivate it instead.");
        }

        // Soft delete
        section.IsDeleted = true;
        section.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result<CourseDto>> CloneAsync(Guid courseId, CloneCourseRequest request, Guid instructorId, CancellationToken cancellationToken = default)
    {
        // Load the original course with ALL related data
        var original = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections.Where(s => !s.IsDeleted))
                .ThenInclude(s => s.MeetingTimes.Where(mt => !mt.IsDeleted))
            .Include(c => c.CourseTags.Where(ct => !ct.IsDeleted))
                .ThenInclude(ct => ct.Tag)
            .Include(c => c.LessonSections.Where(ls => !ls.IsDeleted))
            .Include(c => c.Lessons.Where(l => !l.IsDeleted))
            .Include(c => c.Assignments.Where(a => !a.IsDeleted))
            .Include(c => c.Exams.Where(e => !e.IsDeleted))
                .ThenInclude(e => e.Questions.Where(q => !q.IsDeleted))
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted, cancellationToken);

        if (original == null)
        {
            return Result<CourseDto>.Failure("Course not found.");
        }

        // Validate dates if both provided
        if (request.CourseStartDate.HasValue && request.CourseEndDate.HasValue &&
            NormalizeUtcDateOnly(request.CourseEndDate) < NormalizeUtcDateOnly(request.CourseStartDate))
        {
            return Result<CourseDto>.Failure("Course end date must be on or after start date.");
        }

        // Create the new course entity
        var newCourse = new Course
        {
            Title = !string.IsNullOrWhiteSpace(request.Title) ? request.Title : $"{original.Title} (New Batch)",
            Description = original.Description,
            Category = original.Category,
            Level = original.Level,
            Modality = original.Modality,
            ProviderType = original.ProviderType,
            ProviderName = original.ProviderName,
            InstructorId = instructorId,
            Price = original.Price,
            ThumbnailUrl = original.ThumbnailUrl,
            ExpectedDurationHours = original.ExpectedDurationHours,
            CourseStartDate = NormalizeUtcDateOnly(request.CourseStartDate),
            CourseEndDate = NormalizeUtcDateOnly(request.CourseEndDate),
            IssueCertificates = original.IssueCertificates,
            CertificateSummary = original.CertificateSummary,
            CertificateDisplayHours = original.CertificateDisplayHours,
            Status = CourseStatus.Draft,
            Rating = 0,
            RatingCount = 0,
            IsFeatured = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Courses.Add(newCourse);
        await _context.SaveChangesAsync(cancellationToken);

        // Copy tags
        foreach (var ct in original.CourseTags.Where(ct => !ct.IsDeleted))
        {
            _context.CourseTags.Add(new CourseTag
            {
                CourseId = newCourse.Id,
                TagId = ct.TagId
            });
        }
        await _context.SaveChangesAsync(cancellationToken);

        // Clone sections with meeting times
        if (request.CopySections)
        {
            foreach (var section in original.Sections.Where(s => !s.IsDeleted))
            {
                var newSection = new CourseSection
                {
                    CourseId = newCourse.Id,
                    Name = section.Name,
                    LocationLabel = section.LocationLabel,
                    JoinUrl = section.JoinUrl,
                    MaxSeats = section.MaxSeats,
                    SeatsRemaining = section.MaxSeats,
                    IsActive = section.IsActive,
                    CreatedAt = DateTime.UtcNow
                };

                _context.CourseSections.Add(newSection);
                await _context.SaveChangesAsync(cancellationToken);

                foreach (var mt in section.MeetingTimes.Where(mt => !mt.IsDeleted))
                {
                    _context.SectionMeetingTimes.Add(new SectionMeetingTime
                    {
                        SectionId = newSection.Id,
                        Day = mt.Day,
                        StartMinutes = mt.StartMinutes,
                        EndMinutes = mt.EndMinutes,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Clone lesson sections and lessons
        if (request.CopyLessons)
        {
            // Build a map from old LessonSection ID -> new LessonSection ID
            var lessonSectionMap = new Dictionary<Guid, Guid>();

            foreach (var ls in original.LessonSections.Where(ls => !ls.IsDeleted).OrderBy(ls => ls.Order))
            {
                var newLs = new LessonSection
                {
                    CourseId = newCourse.Id,
                    Title = ls.Title,
                    Description = ls.Description,
                    Order = ls.Order,
                    CreatedAt = DateTime.UtcNow
                };

                _context.LessonSections.Add(newLs);
                await _context.SaveChangesAsync(cancellationToken);

                lessonSectionMap[ls.Id] = newLs.Id;
            }

            foreach (var lesson in original.Lessons.Where(l => !l.IsDeleted).OrderBy(l => l.Order))
            {
                var newLesson = new Lesson
                {
                    CourseId = newCourse.Id,
                    SectionId = lesson.SectionId.HasValue && lessonSectionMap.ContainsKey(lesson.SectionId.Value)
                        ? lessonSectionMap[lesson.SectionId.Value]
                        : null,
                    Title = lesson.Title,
                    Description = lesson.Description,
                    VideoUrl = lesson.VideoUrl,
                    DurationMinutes = lesson.DurationMinutes,
                    Order = lesson.Order,
                    IsPreview = lesson.IsPreview,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Lessons.Add(newLesson);
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Clone assignments
        if (request.CopyAssignments)
        {
            foreach (var assignment in original.Assignments.Where(a => !a.IsDeleted))
            {
                var newAssignment = new Assignment
                {
                    CourseId = newCourse.Id,
                    Title = assignment.Title,
                    Prompt = assignment.Prompt,
                    MaxScore = assignment.MaxScore,
                    Weight = assignment.Weight,
                    AllowLateSubmission = assignment.AllowLateSubmission,
                    LatePenaltyPercent = assignment.LatePenaltyPercent,
                    Status = AssignmentStatus.Draft,
                    DueAt = default, // Teacher sets new due dates
                    CreatedAt = DateTime.UtcNow
                };

                _context.Assignments.Add(newAssignment);
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Clone exams with questions
        if (request.CopyExams)
        {
            foreach (var exam in original.Exams.Where(e => !e.IsDeleted))
            {
                var newExam = new Exam
                {
                    CourseId = newCourse.Id,
                    Title = exam.Title,
                    Description = exam.Description,
                    DurationMinutes = exam.DurationMinutes,
                    IsActive = false,
                    AllowRetake = exam.AllowRetake,
                    MaxAttempts = exam.MaxAttempts,
                    StartsAt = default, // Teacher sets new start time
                    CreatedAt = DateTime.UtcNow
                };

                _context.Exams.Add(newExam);
                await _context.SaveChangesAsync(cancellationToken);

                foreach (var question in exam.Questions.Where(q => !q.IsDeleted).OrderBy(q => q.Order))
                {
                    _context.ExamQuestions.Add(new ExamQuestion
                    {
                        ExamId = newExam.Id,
                        Prompt = question.Prompt,
                        Type = question.Type,
                        ChoicesJson = question.ChoicesJson,
                        AnswerIndex = question.AnswerIndex,
                        Points = question.Points,
                        Order = question.Order,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        // Reload the new course with all relations for the DTO
        var createdCourse = await _context.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Sections)
                .ThenInclude(s => s.MeetingTimes)
            .Include(c => c.CourseTags)
                .ThenInclude(ct => ct.Tag)
            .FirstAsync(c => c.Id == newCourse.Id, cancellationToken);

        var sectionIds = createdCourse.Sections.Where(s => !s.IsDeleted).Select(s => s.Id).ToList();
        var enrollmentCounts = await GetEnrollmentCountsBySectionAsync(sectionIds, cancellationToken);
        var courseDto = MapToCourseDto(createdCourse, enrollmentCounts);

        _logger.LogInformation("Course {OriginalCourseId} cloned to {NewCourseId} by instructor {InstructorId}.",
            courseId, newCourse.Id, instructorId);

        return Result<CourseDto>.Success(courseDto);
    }

    private static bool IntervalsOverlap(int startA, int endA, int startB, int endB) =>
        startA < endB && startB < endA;

    private static bool HasInternalOverlap(IReadOnlyList<MeetingSlot> slots)
    {
        for (var i = 0; i < slots.Count; i++)
        {
            for (var j = i + 1; j < slots.Count; j++)
            {
                if (slots[i].Day != slots[j].Day)
                    continue;
                if (IntervalsOverlap(
                        slots[i].StartMinutes, slots[i].EndMinutes,
                        slots[j].StartMinutes, slots[j].EndMinutes))
                    return true;
            }
        }

        return false;
    }

    private static List<MeetingSlot> ParseMeetingSlots(IEnumerable<CreateMeetingTimeRequest> meetingTimes)
    {
        var list = new List<MeetingSlot>();
        foreach (var mt in meetingTimes)
        {
            if (!Enum.TryParse<Domain.Common.DayOfWeek>(mt.Day, true, out var day))
                continue;
            if (mt.StartMinutes >= mt.EndMinutes)
                continue;

            list.Add(new MeetingSlot(day, mt.StartMinutes, mt.EndMinutes));
        }

        return list;
    }

    private async Task<string?> ValidateInstructorScheduleNoOverlapAsync(
        Guid instructorId,
        IReadOnlyList<MeetingSlot> proposedSlots,
        Guid? excludeSectionId,
        CancellationToken cancellationToken)
    {
        if (proposedSlots.Count == 0)
            return null;

        if (HasInternalOverlap(proposedSlots))
        {
            return "Schedule conflict: two or more meeting times in this request overlap. Sections must have separate times.";
        }

        var existingQuery = _context.SectionMeetingTimes
            .AsNoTracking()
            .Include(mt => mt.Section)
                .ThenInclude(s => s!.Course)
            .Where(mt => !mt.IsDeleted
                && mt.Section != null && !mt.Section.IsDeleted
                && mt.Section.Course != null && !mt.Section.Course.IsDeleted
                && mt.Section.Course.InstructorId == instructorId);

        if (excludeSectionId.HasValue)
            existingQuery = existingQuery.Where(mt => mt.SectionId != excludeSectionId.Value);

        var existing = await existingQuery.ToListAsync(cancellationToken);

        foreach (var p in proposedSlots)
        {
            foreach (var e in existing.Where(x => x.Day == p.Day))
            {
                if (IntervalsOverlap(p.StartMinutes, p.EndMinutes, e.StartMinutes, e.EndMinutes))
                {
                    var courseTitle = e.Section!.Course!.Title;
                    var sectionName = e.Section.Name;
                    return $"Schedule conflict: this time overlaps with section \"{sectionName}\" in course \"{courseTitle}\". You cannot teach two classes at the same time.";
                }
            }
        }

        return null;
    }

    private sealed record MeetingSlot(Domain.Common.DayOfWeek Day, int StartMinutes, int EndMinutes);

    private async Task<Dictionary<Guid, int>> GetEnrollmentCountsBySectionAsync(IEnumerable<Guid> sectionIds, CancellationToken cancellationToken)
    {
        var ids = sectionIds?.ToList() ?? new List<Guid>();
        if (ids.Count == 0) return new Dictionary<Guid, int>();

        return await _context.Enrollments
            .Where(e => ids.Contains(e.SectionId) && !e.IsDeleted &&
                (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
            .GroupBy(e => e.SectionId)
            .Select(g => new { SectionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SectionId, x => x.Count, cancellationToken);
    }

    private static CourseDto MapToCourseDto(Course course, IReadOnlyDictionary<Guid, int> enrollmentCountsBySection)
    {
        var counts = enrollmentCountsBySection ?? new Dictionary<Guid, int>();
        var sections = course.Sections
            .Where(s => !s.IsDeleted)
            .Select(s => MapToCourseSectionDto(s, counts.GetValueOrDefault(s.Id, 0)))
            .ToList();

        var tags = course.CourseTags
            .Where(ct => !ct.IsDeleted)
            .Select(ct => ct.Tag.Name)
            .ToList();

        return new CourseDto
        {
            Id = course.Id,
            Title = course.Title,
            Description = course.Description,
            Category = course.Category,
            Level = course.Level.ToString(),
            Modality = course.Modality.ToString(),
            ProviderType = course.ProviderType.ToString(),
            ProviderName = course.ProviderName,
            InstructorId = course.InstructorId,
            InstructorName = course.Instructor?.FullName ?? string.Empty,
            Rating = course.Rating,
            RatingCount = course.RatingCount,
            IsFeatured = course.IsFeatured,
            Status = course.Status.ToString(),
            Price = course.Price,
            ThumbnailUrl = course.ThumbnailUrl,
            Tags = tags,
            Sections = sections,
            CreatedAt = course.CreatedAt,
            ExpectedDurationHours = course.ExpectedDurationHours,
            CourseStartDate = course.CourseStartDate,
            CourseEndDate = course.CourseEndDate,
            IssueCertificates = course.IssueCertificates,
            CertificateSummary = course.CertificateSummary,
            CertificateDisplayHours = course.CertificateDisplayHours
        };
    }

    private static DateTime? NormalizeUtcDateOnly(DateTime? value)
    {
        if (!value.HasValue) return null;
        var d = value.Value;
        return new DateTime(d.Year, d.Month, d.Day, 0, 0, 0, DateTimeKind.Utc);
    }

    private static CourseSectionDto MapToCourseSectionDto(CourseSection section, int enrollmentsCount = 0)
    {
        var meetingTimes = section.MeetingTimes
            .Where(mt => !mt.IsDeleted)
            .Select(mt => new MeetingTimeDto
            {
                Id = mt.Id,
                Day = mt.Day.ToString(),
                StartMinutes = mt.StartMinutes,
                EndMinutes = mt.EndMinutes,
                StartTime = FormatMinutes(mt.StartMinutes),
                EndTime = FormatMinutes(mt.EndMinutes)
            })
            .ToList();

        var seatsRemaining = Math.Max(0, section.MaxSeats - enrollmentsCount);

        return new CourseSectionDto
        {
            Id = section.Id,
            CourseId = section.CourseId,
            Name = section.Name,
            LocationLabel = section.LocationLabel,
            JoinUrl = section.JoinUrl,
            MaxSeats = section.MaxSeats,
            SeatsRemaining = seatsRemaining,
            IsActive = section.IsActive,
            MeetingTimes = meetingTimes
        };
    }

    private static string FormatMinutes(int minutes)
    {
        var hours = minutes / 60;
        var mins = minutes % 60;
        var period = hours >= 12 ? "PM" : "AM";
        var displayHours = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
        return $"{displayHours}:{mins:D2} {period}";
    }
}

