import { apiClient, type ApiError } from '../lib/api';
import type { PagedRequest, PagedResult } from './courseService';

export interface ExamDto {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  isActive: boolean;
  allowRetake: boolean;
  maxAttempts?: number;
  questionCount: number;
  createdAt: string;
}

export interface ExamQuestionDto {
  id: string;
  examId: string;
  prompt: string;
  type: string; // MultipleChoice, TrueFalse
  choices: string[];
  order: number;
  points: number;
  // Note: AnswerIndex is NOT included for security (only in grading)
}

export interface ExamAttemptDto {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  userName: string;
  userEmail?: string;
  startedAt: string;
  submittedAt?: string;
  score: number;
  total: number;
  percentage: number;
  scorePublishedAt?: string | null;
}

export interface ExamQuestionResultDto {
  id: string;
  examId: string;
  prompt: string;
  type: string;
  choices: string[];
  order: number;
  points: number;
  correctAnswerIndex: number;
  userAnswerIndex: number | null;
  userAnswerText?: string | null; // For ShortAnswer
  isCorrect: boolean;
}

export interface ExamResultDto {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  total: number;
  percentage: number;
  startedAt: string;
  submittedAt?: string;
  scorePublishedAt?: string | null;
  questions: ExamQuestionResultDto[];
}

export interface StartExamRequest {
  examId: string;
}

export interface StartExamResponse {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  expiresAt: string;
  questions: ExamQuestionDto[];
}

export interface SubmitExamRequest {
  attemptId: string;
  answers: Record<string, number>; // QuestionId -> ChoiceIndex
  answerTexts?: Record<string, string>; // QuestionId -> text (ShortAnswer)
}

export interface CreateExamQuestionRequest {
  prompt: string;
  type: string; // MultipleChoice, TrueFalse
  choices: string[];
  answerIndex: number;
  points: number;
  order: number;
}

export interface CreateExamRequest {
  courseId: string;
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  allowRetake: boolean;
  maxAttempts?: number;
  questions: CreateExamQuestionRequest[];
}

class ExamService {
  async getExamById(id: string): Promise<ExamDto> {
    try {
      const response = await apiClient.get<ExamDto>(`/exams/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch exam');
    }
  }

  async createExam(request: CreateExamRequest): Promise<ExamDto> {
    try {
      const response = await apiClient.post<ExamDto>('/exams', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to create exam');
    }
  }

  async getCourseExams(courseId: string, request: PagedRequest = {}): Promise<PagedResult<ExamDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/exams/course/${courseId}?${queryString}` : `/exams/course/${courseId}`;
      
      const response = await apiClient.get<PagedResult<ExamDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch course exams');
    }
  }

  async getMyExams(request: PagedRequest = {}): Promise<PagedResult<ExamDto>> {
    try {
      // Get all enrollments first, then get exams for each enrolled course
      // Use dynamic import to avoid circular dependency
      const enrollmentModule = await import('./enrollmentService');
      const enrollmentsResult = await enrollmentModule.enrollmentService.getMyEnrollments({ pageSize: 100 });
      
      // Get unique course IDs
      const courseIds = Array.from(new Set(enrollmentsResult.items.map(e => e.courseId)));
      
      // Get exams for all enrolled courses
      const allExams: ExamDto[] = [];
      await Promise.all(
        courseIds.map(async (courseId) => {
          try {
            const examsResult = await this.getCourseExams(courseId, request);
            allExams.push(...examsResult.items);
          } catch (error) {
            console.error(`Failed to load exams for course ${courseId}:`, error);
          }
        })
      );

      // Deduplicate by (courseId, title, startsAt) so the same exam slot appears once even if DB has duplicate rows
      const bySlot = new Map<string, ExamDto>();
      for (const e of allExams) {
        if (!e?.id) continue;
        const slot = `${e.courseId}|${e.title}|${e.startsAt}`;
        if (!bySlot.has(slot)) bySlot.set(slot, e);
      }
      const items = Array.from(bySlot.values());

      // Return as paged result
      return {
        items,
        pageNumber: request.pageNumber || 1,
        pageSize: request.pageSize || 10,
        totalCount: items.length,
        totalPages: Math.ceil(items.length / (request.pageSize || 10)),
      };
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch my exams');
    }
  }

  async startExam(request: StartExamRequest): Promise<StartExamResponse> {
    try {
      const response = await apiClient.post<StartExamResponse>('/exams/start', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to start exam');
    }
  }

  async submitExam(request: SubmitExamRequest): Promise<ExamAttemptDto> {
    try {
      const response = await apiClient.post<ExamAttemptDto>('/exams/submit', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to submit exam');
    }
  }

  async getMyAttempts(request: PagedRequest = {}): Promise<PagedResult<ExamAttemptDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/exams/attempts/me?${queryString}` : '/exams/attempts/me';
      
      const response = await apiClient.get<PagedResult<ExamAttemptDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch exam attempts');
    }
  }

  async getAttemptById(attemptId: string): Promise<ExamAttemptDto> {
    try {
      const response = await apiClient.get<ExamAttemptDto>(`/exams/attempts/${attemptId}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch exam attempt');
    }
  }

  async getExamAttempts(examId: string, request: PagedRequest = {}): Promise<PagedResult<ExamAttemptDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString
        ? `/exams/${examId}/attempts?${queryString}`
        : `/exams/${examId}/attempts`;
      const response = await apiClient.get<PagedResult<ExamAttemptDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch exam attempts');
    }
  }

  async updateAttemptScore(attemptId: string, score: number): Promise<ExamAttemptDto> {
    try {
      const response = await apiClient.patch<ExamAttemptDto>(`/exams/attempts/${attemptId}/score`, { score });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to update grade');
    }
  }

  async publishAttemptScore(attemptId: string): Promise<ExamAttemptDto> {
    try {
      const response = await apiClient.post<ExamAttemptDto>(`/exams/attempts/${attemptId}/publish`, {});
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to publish score');
    }
  }

  /** Instructor only: get full submission (questions + answers) for grading */
  async getAttemptSubmission(attemptId: string): Promise<ExamResultDto> {
    try {
      const response = await apiClient.get<ExamResultDto>(`/exams/attempts/${attemptId}/submission`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to load submission');
    }
  }

  async getExamResults(attemptId: string): Promise<ExamResultDto> {
    try {
      console.log(`[ExamService] Fetching exam results for attempt: ${attemptId}`);
      const endpoint = `/exams/attempts/${attemptId}/results`;
      console.log(`[ExamService] Endpoint: ${endpoint}`);
      const response = await apiClient.get<ExamResultDto>(endpoint);
      console.log(`[ExamService] Successfully received exam results:`, response);
      return response;
    } catch (error) {
      console.error(`[ExamService] Error fetching exam results:`, error);
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to fetch exam results';
      console.error(`[ExamService] Error details:`, {
        error: apiError.error,
        detail: apiError.detail,
        title: apiError.title,
        status: apiError.status,
      });
      throw new Error(errorMessage);
    }
  }
}

export const examService = new ExamService();

