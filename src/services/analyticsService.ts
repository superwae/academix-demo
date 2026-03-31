import { apiClient } from '../lib/api';

// Risk levels matching backend enum
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type EngagementLevel = 'VeryLow' | 'Low' | 'Medium' | 'High' | 'VeryHigh';

export interface StudentAnalytics {
  userId: string;
  studentName: string;
  email: string;
  profilePictureUrl?: string;

  // Engagement
  engagementScore: number;
  engagementLevel: EngagementLevel;

  // Risk Assessment
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];

  // Performance
  averageGrade: number;
  predictedFinalGrade: number;
  completionRate: number;

  // Activity
  totalEnrollments: number;
  completedCourses: number;
  activeCourses: number;
  droppedCourses: number;
  totalLessonsWatched: number;
  totalAssignmentsSubmitted: number;
  totalExamsTaken: number;
  lastActivityAt?: string;
  daysSinceLastActivity: number;

  // Recommendations
  recommendations: string[];
}

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  instructorName: string;

  // Enrollment Stats
  totalEnrollments: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
  completionRate: number;
  dropRate: number;

  // Performance Stats
  averageProgress: number;
  averageGrade: number;
  averageEngagement: number;

  // At-Risk Students
  atRiskStudentCount: number;
  atRiskStudents: StudentAnalytics[];

  // Lesson Stats
  totalLessons: number;
  lessonStats: LessonAnalytics[];

  // Assignment Stats
  totalAssignments: number;
  averageAssignmentScore: number;
  assignmentSubmissionRate: number;

  // Exam Stats
  totalExams: number;
  averageExamScore: number;
  examPassRate: number;
}

export interface LessonAnalytics {
  lessonId: string;
  lessonTitle: string;
  order: number;
  totalViews: number;
  completedCount: number;
  completionRate: number;
  averageWatchPercentage: number;
  averageWatchDurationSeconds: number;
  isDropoffPoint: boolean;
  dropoffRate: number;
}

export interface InstructorAnalytics {
  instructorId: string;
  instructorName: string;
  profilePictureUrl?: string;

  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  activeStudents: number;

  averageRating: number;
  totalReviews: number;

  averageCompletionRate: number;
  averageStudentGrade: number;

  courseAnalytics: CourseAnalytics[];
}

class AnalyticsService {
  /**
   * Get analytics for a specific student (instructor view)
   */
  async getStudentAnalytics(studentId: string): Promise<StudentAnalytics> {
    return apiClient.get<StudentAnalytics>(`/analytics/students/${studentId}`);
  }

  /**
   * Get analytics for the current user (student self-view)
   */
  async getMyAnalytics(): Promise<StudentAnalytics> {
    return apiClient.get<StudentAnalytics>('/analytics/me');
  }

  /**
   * Get analytics for a specific course
   */
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    return apiClient.get<CourseAnalytics>(`/analytics/courses/${courseId}`);
  }

  /**
   * Get at-risk students for a specific course
   */
  async getCourseAtRiskStudents(courseId: string): Promise<StudentAnalytics[]> {
    return apiClient.get<StudentAnalytics[]>(`/analytics/courses/${courseId}/at-risk`);
  }

  /**
   * Get instructor analytics for the current user
   */
  async getMyInstructorAnalytics(): Promise<InstructorAnalytics> {
    return apiClient.get<InstructorAnalytics>('/analytics/instructors/me');
  }

  /**
   * Get lesson-level analytics for a course
   */
  async getLessonAnalytics(courseId: string): Promise<LessonAnalytics[]> {
    return apiClient.get<LessonAnalytics[]>(`/analytics/courses/${courseId}/lessons`);
  }

  /**
   * Predict final grade for a student in a specific course
   */
  async predictGrade(studentId: string, courseId: string): Promise<number> {
    const response = await apiClient.get<{ predictedGrade: number }>(
      `/analytics/predict-grade?studentId=${studentId}&courseId=${courseId}`
    );
    return response.predictedGrade;
  }
}

export const analyticsService = new AnalyticsService();
