import { apiClient, type ApiError } from '../lib/api';
import type { PagedRequest, PagedResult } from './courseService';

export interface EnrollmentDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  sectionId: string;
  sectionName: string;
  enrolledAt: string;
  status: string;
  progressPercentage: number;
  completedAt?: string;
}

export interface CreateEnrollmentRequest {
  courseId: string;
  sectionId: string;
}

class EnrollmentService {
  async getMyEnrollments(request: PagedRequest = {}): Promise<PagedResult<EnrollmentDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/enrollments/me?${queryString}` : '/enrollments/me';
      
      const response = await apiClient.get<PagedResult<EnrollmentDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch enrollments');
    }
  }

  /** Get enrollments for a course (instructor or admin) */
  async getCourseEnrollments(courseId: string, request: PagedRequest = {}): Promise<PagedResult<EnrollmentDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/enrollments/course/${courseId}?${queryString}`
        : `/enrollments/course/${courseId}`;
      const response = await apiClient.get<PagedResult<EnrollmentDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch course enrollments');
    }
  }

  async getEnrollmentById(id: string): Promise<EnrollmentDto> {
    try {
      const response = await apiClient.get<EnrollmentDto>(`/enrollments/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch enrollment');
    }
  }

  async enroll(request: CreateEnrollmentRequest): Promise<EnrollmentDto> {
    try {
      const response = await apiClient.post<EnrollmentDto>('/enrollments', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to enroll in course';
      console.error('Enrollment error:', apiError);
      throw new Error(errorMessage);
    }
  }

  async unenroll(enrollmentId: string): Promise<void> {
    try {
      await apiClient.delete(`/enrollments/${enrollmentId}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to unenroll from course';
      console.error('Unenrollment error:', apiError);
      throw new Error(errorMessage);
    }
  }
}

export const enrollmentService = new EnrollmentService();

