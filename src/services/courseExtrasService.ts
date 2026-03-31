import { apiClient, type ApiError } from '../lib/api';

export type CourseMaterialKind = 0 | 1;

export interface CourseMaterialDto {
  id: string;
  courseId: string;
  lessonId?: string | null;
  lessonTitle?: string | null;
  title: string;
  fileUrl: string;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  sortOrder: number;
  kind: CourseMaterialKind;
}

export interface CreateCourseMaterialRequest {
  courseId: string;
  lessonId?: string | null;
  title: string;
  fileUrl: string;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  sortOrder: number;
  kind: CourseMaterialKind;
}

export interface LessonRatingSummaryDto {
  lessonId: string;
  lessonTitle: string;
  averageRating: number;
  ratingCount: number;
  myRating?: number | null;
}

export interface MeetingTimeRatingSummaryDto {
  sectionMeetingTimeId: string;
  sectionId: string;
  sectionName: string;
  day: number;
  startMinutes: number;
  endMinutes: number;
  averageRating: number;
  ratingCount: number;
  myRating?: number | null;
}

export interface CertificateDto {
  eligible: boolean;
  studentName: string;
  courseTitle: string;
  courseDescription?: string | null;
  expectedDurationHours?: number | null;
  instructorName: string;
  completedAt?: string | null;
  issuedAt: string;
  certificateId: string;
}

export interface UpsertRatingBody {
  rating: number;
  comment?: string | null;
}

class CourseExtrasService {
  async getMaterials(courseId: string): Promise<CourseMaterialDto[]> {
    try {
      return await apiClient.get<CourseMaterialDto[]>(`/courses/${courseId}/materials`);
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to load materials');
    }
  }

  async createMaterial(courseId: string, body: Omit<CreateCourseMaterialRequest, 'courseId'>): Promise<CourseMaterialDto> {
    try {
      const payload: CreateCourseMaterialRequest = { ...body, courseId };
      return await apiClient.post<CourseMaterialDto>(`/courses/${courseId}/materials`, payload);
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to add material');
    }
  }

  async deleteMaterial(courseId: string, materialId: string): Promise<void> {
    try {
      await apiClient.delete(`/courses/${courseId}/materials/${materialId}`);
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to delete material');
    }
  }

  async getLessonRatingSummaries(courseId: string): Promise<LessonRatingSummaryDto[]> {
    try {
      return await apiClient.get<LessonRatingSummaryDto[]>(`/courses/${courseId}/lesson-ratings/summary`);
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to load lesson ratings');
    }
  }

  async upsertLessonRating(courseId: string, lessonId: string, body: UpsertRatingBody): Promise<LessonRatingSummaryDto> {
    try {
      return await apiClient.put<LessonRatingSummaryDto>(
        `/courses/${courseId}/lesson-ratings/lessons/${lessonId}`,
        body,
      );
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to save rating');
    }
  }

  async getMeetingTimeRatingSummaries(courseId: string): Promise<MeetingTimeRatingSummaryDto[]> {
    try {
      return await apiClient.get<MeetingTimeRatingSummaryDto[]>(
        `/courses/${courseId}/meeting-time-ratings/summary`,
      );
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to load session ratings');
    }
  }

  async upsertMeetingTimeRating(
    courseId: string,
    meetingTimeId: string,
    body: UpsertRatingBody,
  ): Promise<MeetingTimeRatingSummaryDto> {
    try {
      return await apiClient.put<MeetingTimeRatingSummaryDto>(
        `/courses/${courseId}/meeting-time-ratings/meeting-times/${meetingTimeId}`,
        body,
      );
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to save rating');
    }
  }

  async getCertificate(courseId: string): Promise<CertificateDto> {
    try {
      return await apiClient.get<CertificateDto>(`/courses/${courseId}/certificate`);
    } catch (e) {
      const err = e as ApiError;
      throw new Error(err.error || 'Failed to load certificate');
    }
  }
}

export const courseExtrasService = new CourseExtrasService();
