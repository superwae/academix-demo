import { apiClient, type ApiError } from '../lib/api';
import type { PagedRequest, PagedResult } from './courseService';

export interface AssignmentDto {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  prompt: string;
  dueAt: string;
  status: string;
  maxScore: number;
  weight: number;
  allowLateSubmission: boolean;
  latePenaltyPercent?: number;
  createdAt: string;
}

export interface AssignmentSubmissionDto {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  userId: string;
  userName: string;
  text: string;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
  graderName?: string;
  /** Points the instructor entered before late penalty; API may infer for legacy rows. */
  instructorScore?: number;
  score?: number;
  feedback?: string;
  isLate: boolean;
}

export interface SubmitAssignmentRequest {
  text: string;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
}

export interface CreateAssignmentRequest {
  courseId: string;
  title: string;
  prompt: string;
  dueAt: string;
  maxScore: number;
  weight: number;
  allowLateSubmission: boolean;
  latePenaltyPercent?: number;
  status?: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  prompt?: string;
  dueAt?: string;
  maxScore?: number;
  weight?: number;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  status?: string;
}

export interface GradeSubmissionRequest {
  score: number;
  feedback?: string;
}

class AssignmentService {
  async getMyAssignments(request: PagedRequest = {}): Promise<PagedResult<AssignmentDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/assignments/me?${queryString}` : '/assignments/me';
      
      const response = await apiClient.get<PagedResult<AssignmentDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch assignments');
    }
  }

  async getCourseAssignments(courseId: string, request: PagedRequest = {}): Promise<PagedResult<AssignmentDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/assignments/course/${courseId}?${queryString}` : `/assignments/course/${courseId}`;
      
      const response = await apiClient.get<PagedResult<AssignmentDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch course assignments');
    }
  }

  async getAssignmentById(id: string): Promise<AssignmentDto> {
    try {
      const response = await apiClient.get<AssignmentDto>(`/assignments/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch assignment');
    }
  }

  async getSubmission(assignmentId: string): Promise<AssignmentSubmissionDto | null> {
    try {
      const response = await apiClient.get<AssignmentSubmissionDto>(`/assignments/${assignmentId}/my-submission`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      // If submission doesn't exist, return null instead of throwing
      if (apiError.error?.includes('not found') || apiError.error?.includes('No submission')) {
        return null;
      }
      throw new Error(apiError.error || 'Failed to fetch submission');
    }
  }

  async submitAssignment(assignmentId: string, request: SubmitAssignmentRequest): Promise<AssignmentSubmissionDto> {
    try {
      const response = await apiClient.post<AssignmentSubmissionDto>(
        `/assignments/${assignmentId}/submit`,
        request
      );
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to submit assignment');
    }
  }

  async getSubmissions(assignmentId: string, request: PagedRequest = {}): Promise<PagedResult<AssignmentSubmissionDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString 
        ? `/assignments/${assignmentId}/submissions?${queryString}` 
        : `/assignments/${assignmentId}/submissions`;
      
      const response = await apiClient.get<PagedResult<AssignmentSubmissionDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch submissions');
    }
  }

  async createAssignment(request: CreateAssignmentRequest): Promise<AssignmentDto> {
    try {
      const response = await apiClient.post<AssignmentDto>('/assignments', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to create assignment');
    }
  }

  async updateAssignment(id: string, request: UpdateAssignmentRequest): Promise<AssignmentDto> {
    try {
      const response = await apiClient.put<AssignmentDto>(`/assignments/${id}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to update assignment');
    }
  }

  async deleteAssignment(id: string): Promise<void> {
    try {
      await apiClient.delete(`/assignments/${id}`);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to delete assignment');
    }
  }

  async gradeSubmission(submissionId: string, request: GradeSubmissionRequest): Promise<AssignmentSubmissionDto> {
    try {
      const response = await apiClient.post<AssignmentSubmissionDto>(
        `/assignments/submissions/${submissionId}/grade`,
        request
      );
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || apiError.detail || apiError.title || 'Failed to save grade');
    }
  }
}

export const assignmentService = new AssignmentService();



