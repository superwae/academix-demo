import { apiClient, type ApiError } from '../lib/api';
import type { CourseDto, PagedRequest, PagedResult } from './courseService';
import type { EnrollmentDto } from './enrollmentService';
import type { AssignmentSubmissionDto } from './assignmentService';

export interface TeacherDashboardStats {
  totalCourses: number;
  totalStudents: number;
  activeClasses: number;
  pendingSubmissions: number;
  averageRating: number;
}

export interface TodayClass {
  id: string;
  courseId: string;
  courseName: string;
  sectionId: string;
  sectionName: string;
  startTime: string;
  endTime: string;
  modality: string;
  joinUrl?: string;
}

export interface RecentActivity {
  id: string;
  type: 'enrollment' | 'submission' | 'message';
  message: string;
  time: string;
  timestamp: string;
}

export interface EnrolledStudent {
  id: string;
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  courseId: string;
  courseName: string;
  sectionName: string;
  progress: number;
  enrolledAt: string;
  status: string;
}

class TeacherService {
  /**
   * Get instructor's courses
   */
  async getMyCourses(request: PagedRequest = {}): Promise<PagedResult<CourseDto>> {
    try {
      // Get current user ID from localStorage
      const userStr = localStorage.getItem('academix.auth');
      if (!userStr) {
        throw new Error('User not authenticated');
      }
      const user = JSON.parse(userStr);
      const instructorId = user.state?.user?.id;
      
      if (!instructorId) {
        throw new Error('Instructor ID not found');
      }

      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString 
        ? `/courses/instructor/${instructorId}?${queryString}` 
        : `/courses/instructor/${instructorId}`;
      
      const response = await apiClient.get<PagedResult<CourseDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch instructor courses');
    }
  }

  /**
   * Get dashboard statistics for instructor
   */
  async getDashboardStats(): Promise<TeacherDashboardStats> {
    try {
      // Get instructor's courses
      const coursesResult = await this.getMyCourses({ pageSize: 1000 });
      const courses = coursesResult.items;

      // Calculate total courses
      const totalCourses = courses.length;

      // Get total students (enrollments across all courses)
      let totalStudents = 0;
      const courseIds = courses.map(c => c.id);
      
      // Fetch enrollments for each course
      // NOTE: Currently this endpoint requires Admin role. Instructors need access to their own courses' enrollments.
      const enrollmentPromises = courseIds.map(async (courseId) => {
        try {
          const params = new URLSearchParams();
          params.append('pageSize', '1000');
          const response = await apiClient.get<PagedResult<EnrollmentDto>>(
            `/enrollments/course/${courseId}?${params.toString()}`
          );
          return response.items.length;
        } catch (error) {
          // Endpoint may require Admin role - return 0 for now
          // TODO: Backend needs to add instructor access to their own courses' enrollments
          console.warn(`Failed to get enrollments for course ${courseId} (may require Admin role):`, error);
          return 0;
        }
      });

      const enrollmentCounts = await Promise.all(enrollmentPromises);
      totalStudents = enrollmentCounts.reduce((sum, count) => sum + count, 0);

      // Calculate active classes (courses with active sections)
      const activeClasses = courses.filter(c => 
        c.status === 'Published' && 
        c.sections && 
        c.sections.some(s => s.isActive)
      ).length;

      // Get pending submissions (ungraded assignment submissions)
      let pendingSubmissions = 0;
      try {
        // Get all assignments for instructor's courses
        const assignmentPromises = courseIds.map(async (courseId) => {
          try {
            const params = new URLSearchParams();
            params.append('pageSize', '1000');
            const assignments = await apiClient.get<PagedResult<any>>(
              `/assignments/course/${courseId}?${params.toString()}`
            );
            return assignments.items;
          } catch (error) {
            return [];
          }
        });

        const allAssignments = (await Promise.all(assignmentPromises)).flat();
        const assignmentIds = allAssignments.map(a => a.id);

        // Get submissions for each assignment
        const submissionPromises = assignmentIds.map(async (assignmentId) => {
          try {
            const params = new URLSearchParams();
            params.append('pageSize', '1000');
            const submissions = await apiClient.get<PagedResult<AssignmentSubmissionDto>>(
              `/assignments/${assignmentId}/submissions?${params.toString()}`
            );
            // Count ungraded submissions (no score or gradedAt)
            return submissions.items.filter(s => !s.score || !s.gradedAt).length;
          } catch (error) {
            return 0;
          }
        });

        const submissionCounts = await Promise.all(submissionPromises);
        pendingSubmissions = submissionCounts.reduce((sum, count) => sum + count, 0);
      } catch (error) {
        console.warn('Failed to get pending submissions:', error);
      }

      // Calculate average rating
      const coursesWithRatings = courses.filter(c => c.ratingCount > 0);
      const averageRating = coursesWithRatings.length > 0
        ? coursesWithRatings.reduce((sum, c) => sum + c.rating, 0) / coursesWithRatings.length
        : 0;

      return {
        totalCourses,
        totalStudents,
        activeClasses,
        pendingSubmissions,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      };
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch dashboard statistics');
    }
  }

  /**
   * Enrollments for a course (instructor must own the course; API enforces).
   */
  async getCourseEnrollments(
    courseId: string,
    request: PagedRequest = {},
  ): Promise<PagedResult<EnrollmentDto>> {
    const params = new URLSearchParams();
    if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
    if (request.pageSize) params.append('pageSize', request.pageSize.toString());
    if (request.searchTerm) params.append('searchTerm', request.searchTerm);
    if (request.sortBy) params.append('sortBy', request.sortBy);
    if (request.sortDescending !== undefined)
      params.append('sortDescending', request.sortDescending.toString());
    const queryString = params.toString();
    const endpoint = queryString
      ? `/enrollments/course/${courseId}?${queryString}`
      : `/enrollments/course/${courseId}`;
    return apiClient.get<PagedResult<EnrollmentDto>>(endpoint);
  }

  /**
   * Get today's classes from course sections with meeting times
   */
  async getTodaysClasses(): Promise<TodayClass[]> {
    try {
      const coursesResult = await this.getMyCourses({ pageSize: 1000 });
      const courses = coursesResult.items;

      const today = new Date();
      const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
      const todayClasses: TodayClass[] = [];

      // Check all course sections for today's meeting times
      for (const course of courses) {
        if (!course.sections || course.sections.length === 0) continue;

        for (const section of course.sections) {
          if (!section.meetingTimes || section.meetingTimes.length === 0) continue;

          for (const meetingTime of section.meetingTimes) {
            if (meetingTime.day === todayDay) {
              // Parse time strings (e.g., "10:00 AM", "12:30 PM")
              const startTime = meetingTime.startTime || this.formatMinutesToTime(meetingTime.startMinutes);
              const endTime = meetingTime.endTime || this.formatMinutesToTime(meetingTime.endMinutes);

              todayClasses.push({
                id: `${section.id}-${meetingTime.day}`,
                courseId: course.id,
                courseName: course.title,
                sectionId: section.id,
                sectionName: section.name,
                startTime,
                endTime,
                modality: course.modality,
                joinUrl: section.joinUrl,
              });
            }
          }
        }
      }

      // Sort by start time
      todayClasses.sort((a, b) => {
        const timeA = this.parseTimeToMinutes(a.startTime);
        const timeB = this.parseTimeToMinutes(b.startTime);
        return timeA - timeB;
      });

      return todayClasses;
    } catch (error) {
      const apiError = error as ApiError;
      console.warn('Failed to get today\'s classes:', error);
      return [];
    }
  }

  /**
   * Get recent activity (enrollments, submissions, messages)
   * Fetches from ALL instructor courses to show real-time activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent enrollments from ALL courses (parallel requests)
      try {
        const coursesResult = await this.getMyCourses({ pageSize: 500 });
        const courses = coursesResult.items;
        const courseIds = courses.map(c => c.id);

        const enrollmentPromises = courseIds.map(async (courseId) => {
          try {
            const params = new URLSearchParams();
            params.append('pageSize', '5');
            params.append('sortBy', 'enrolledAt');
            params.append('sortDescending', 'true');
            const response = await apiClient.get<PagedResult<EnrollmentDto>>(
              `/enrollments/course/${courseId}?${params.toString()}`
            );
            const course = courses.find(c => c.id === courseId);
            return response.items.map((e) => ({
              id: `enrollment-${e.id}`,
              type: 'enrollment' as const,
              message: `New student enrolled in ${e.courseTitle || course?.title || 'Course'}`,
              time: this.formatTimeAgo(new Date(e.enrolledAt)),
              timestamp: e.enrolledAt,
            }));
          } catch {
            return [];
          }
        });

        const enrollmentResults = await Promise.all(enrollmentPromises);
        activities.push(...enrollmentResults.flat());
      } catch (error) {
        console.warn('Failed to get recent enrollments:', error);
      }

      // Get recent submissions (from first 15 courses to limit API calls)
      try {
        const coursesResult = await this.getMyCourses({ pageSize: 500 });
        const courseIds = coursesResult.items.map(c => c.id).slice(0, 15);

        for (const courseId of courseIds) {
          try {
            const params = new URLSearchParams();
            params.append('pageSize', '1000');
            const assignments = await apiClient.get<PagedResult<any>>(
              `/assignments/course/${courseId}?${params.toString()}`
            );

            for (const assignment of assignments.items.slice(0, 2)) {
              try {
                const subParams = new URLSearchParams();
                subParams.append('pageSize', '5');
                subParams.append('sortBy', 'submittedAt');
                subParams.append('sortDescending', 'true');
                const submissions = await apiClient.get<PagedResult<AssignmentSubmissionDto>>(
                  `/assignments/${assignment.id}/submissions?${subParams.toString()}`
                );

                submissions.items.forEach((submission) => {
                  activities.push({
                    id: `submission-${submission.id}`,
                    type: 'submission',
                    message: `Assignment submission received for ${assignment.title}`,
                    time: this.formatTimeAgo(new Date(submission.submittedAt)),
                    timestamp: submission.submittedAt,
                  });
                });
              } catch (error) {
                // Skip if endpoint doesn't exist
              }
            }
          } catch (error) {
            // Skip if endpoint doesn't exist
          }
        }
      } catch (error) {
        console.warn('Failed to get recent submissions:', error);
      }

      // Sort by timestamp (most recent first) and limit
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return activities.slice(0, limit);
    } catch (error) {
      console.warn('Failed to get recent activity:', error);
      return [];
    }
  }

  /**
   * Get all students enrolled in instructor's courses
   */
  async getEnrolledStudents(searchTerm?: string): Promise<EnrolledStudent[]> {
    try {
      const coursesResult = await this.getMyCourses({ pageSize: 1000 });
      const courses = coursesResult.items;
      const courseIds = courses.map(c => c.id);

      const allStudents: EnrolledStudent[] = [];
      const seenUserIds = new Set<string>(); // Track unique students

      // Fetch enrollments for each course
      for (const courseId of courseIds) {
        try {
          const params = new URLSearchParams();
          params.append('pageSize', '1000');
          const response = await apiClient.get<PagedResult<EnrollmentDto>>(
            `/enrollments/course/${courseId}?${params.toString()}`
          );

          const course = courses.find(c => c.id === courseId);

          for (const enrollment of response.items) {
            // Create a unique key for student+course combination
            const uniqueKey = `${enrollment.userId}-${enrollment.courseId}`;
            
            if (!seenUserIds.has(uniqueKey)) {
              seenUserIds.add(uniqueKey);
              
              allStudents.push({
                id: uniqueKey,
                enrollmentId: enrollment.id,
                userId: enrollment.userId,
                name: enrollment.userName,
                email: enrollment.userEmail || '',
                courseId: enrollment.courseId,
                courseName: enrollment.courseTitle || course?.title || 'Unknown Course',
                sectionName: enrollment.sectionName,
                progress: enrollment.progressPercentage || 0,
                enrolledAt: enrollment.enrolledAt,
                status: enrollment.status,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to get enrollments for course ${courseId}:`, error);
        }
      }

      // Apply search filter if provided
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return allStudents.filter(s =>
          s.name.toLowerCase().includes(lowerSearch) ||
          s.courseName.toLowerCase().includes(lowerSearch)
        );
      }

      return allStudents;
    } catch (error) {
      console.error('Failed to get enrolled students:', error);
      return [];
    }
  }

  /**
   * Helper: Format minutes to time string (e.g., 600 -> "10:00 AM")
   */
  private formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Helper: Parse time string to minutes (e.g., "10:00 AM" -> 600)
   */
  private parseTimeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  /**
   * Helper: Format time ago (e.g., "2 hours ago")
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }
}

export const teacherService = new TeacherService();

