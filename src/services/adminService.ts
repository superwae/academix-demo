import { apiClient } from '../lib/api';

// Admin Service - provides API methods for admin panel functionality

// ==================== User Types ====================
export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleIds: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface AssignRolesRequest {
  roleIds: string[];
}

// ==================== Course Types ====================
export interface AdminCourseDto {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  modality: string;
  providerType: string;
  providerName: string;
  price: number | null;
  status: string;
  instructorId: string;
  instructorName: string;
  thumbnailUrl?: string;
  rating: number;
  ratingCount: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
}

// ==================== Analytics Types ====================
export interface DailyMetricDto {
  date: string;
  value: number;
}

export interface CourseRankingDto {
  courseId: string;
  title: string;
  instructorName: string;
  thumbnailUrl?: string;
  metricValue: number;
  metricLabel: string;
  rank: number;
}

export interface StudentAnalyticsDto {
  userId: string;
  studentName: string;
  email: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
  riskFactors: string[];
  engagementScore: number;
  completionRate: number;
  averageGrade: number;
  lastActivityAt?: string;
  enrolledCourses: number;
}

export interface AnalyticsDashboardDto {
  // Platform Overview
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;

  // Engagement Overview
  platformEngagementScore: number;
  studentsActiveToday: number;
  studentsActiveThisWeek: number;
  studentsActiveThisMonth: number;

  // Risk Overview
  atRiskStudentCount: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;

  // Performance Overview
  averageCourseCompletion: number;
  averageStudentGrade: number;

  // Trends (last 30 days)
  enrollmentTrend: DailyMetricDto[];
  activityTrend: DailyMetricDto[];
  completionTrend: DailyMetricDto[];

  // Top Performers
  topPerformers: StudentAnalyticsDto[];

  // Needs Attention
  needsAttention: StudentAnalyticsDto[];

  // Course Rankings
  topRatedCourses: CourseRankingDto[];
  mostEnrolledCourses: CourseRankingDto[];
  highestCompletionCourses: CourseRankingDto[];
}

// ==================== Paged Types ====================
export interface PagedRequest {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==================== Admin Service ====================
class AdminService {
  // ==================== Users ====================

  async getUsers(request: PagedRequest = {}): Promise<PagedResult<AdminUserDto>> {
    const params = new URLSearchParams();
    if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
    if (request.pageSize) params.append('pageSize', request.pageSize.toString());
    if (request.searchTerm) params.append('searchTerm', request.searchTerm);
    if (request.sortBy) params.append('sortBy', request.sortBy);
    if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

    const query = params.toString();
    return apiClient.get<PagedResult<AdminUserDto>>(`/users${query ? `?${query}` : ''}`);
  }

  async getUser(userId: string): Promise<AdminUserDto> {
    return apiClient.get<AdminUserDto>(`/users/${userId}`);
  }

  async createUser(request: CreateUserRequest): Promise<AdminUserDto> {
    return apiClient.post<AdminUserDto>('/users', request);
  }

  async updateUser(userId: string, request: UpdateUserRequest): Promise<AdminUserDto> {
    return apiClient.put<AdminUserDto>(`/users/${userId}`, request);
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  async suspendUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/suspend`);
  }

  async activateUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/activate`);
  }

  async assignRoles(userId: string, request: AssignRolesRequest): Promise<void> {
    await apiClient.post(`/users/${userId}/roles`, request);
  }

  async revokeRole(userId: string, roleId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/roles/${roleId}`);
  }

  // ==================== Courses ====================

  async getCourses(request: PagedRequest = {}): Promise<PagedResult<AdminCourseDto>> {
    const params = new URLSearchParams();
    if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
    if (request.pageSize) params.append('pageSize', request.pageSize.toString());
    if (request.searchTerm) params.append('searchTerm', request.searchTerm);
    if (request.sortBy) params.append('sortBy', request.sortBy);
    if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

    const query = params.toString();
    return apiClient.get<PagedResult<AdminCourseDto>>(`/courses${query ? `?${query}` : ''}`);
  }

  async getCourse(courseId: string): Promise<AdminCourseDto> {
    return apiClient.get<AdminCourseDto>(`/courses/${courseId}`);
  }

  async publishCourse(courseId: string): Promise<void> {
    await apiClient.post(`/courses/${courseId}/publish`);
  }

  async archiveCourse(courseId: string): Promise<void> {
    await apiClient.post(`/courses/${courseId}/archive`);
  }

  async deleteCourse(courseId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}`);
  }

  // ==================== Analytics ====================

  async getDashboardAnalytics(): Promise<AnalyticsDashboardDto> {
    return apiClient.get<AnalyticsDashboardDto>('/analytics/dashboard');
  }

  async getAtRiskStudents(minimumRisk?: string, limit: number = 50): Promise<StudentAnalyticsDto[]> {
    const params = new URLSearchParams();
    if (minimumRisk) params.append('minimumRisk', minimumRisk);
    params.append('limit', limit.toString());

    const query = params.toString();
    return apiClient.get<StudentAnalyticsDto[]>(`/analytics/at-risk?${query}`);
  }

  // ==================== Export ====================

  async downloadExport(path: string, filename: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const fullUrl = path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;

    const response = await fetch(fullUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async exportUsersCsv(): Promise<void> {
    await this.downloadExport('/export/users/csv', `users-export-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async exportAtRiskStudentsCsv(): Promise<void> {
    await this.downloadExport('/export/at-risk-students/csv', `at-risk-students-${new Date().toISOString().slice(0, 10)}.csv`);
  }
}

export const adminService = new AdminService();
