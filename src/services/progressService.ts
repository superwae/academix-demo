// Progress tracking service for lessons
// This service manages lesson completion and progress tracking via backend API

import { apiClient, type ApiError } from '../lib/api';

export interface LessonProgress {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
  watchedDuration: number; // in seconds
  totalDuration: number; // in seconds
  lastWatchedAt: string; // ISO date string
  completedAt?: string; // ISO date string
}

export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastAccessedAt: string;
}

// Backend DTOs
interface BackendLessonProgressDto {
  id: string;
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
  watchedDurationSeconds: number;
  totalDurationSeconds: number;
  lastWatchedAt: string;
  completedAt?: string;
}

interface BackendCourseProgressDto {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastAccessedAt?: string;
}

class ProgressService {
  // Map backend DTO to frontend interface
  private mapToLessonProgress(dto: BackendLessonProgressDto): LessonProgress {
    return {
      lessonId: dto.lessonId,
      courseId: dto.courseId,
      isCompleted: dto.isCompleted,
      watchedDuration: dto.watchedDurationSeconds,
      totalDuration: dto.totalDurationSeconds,
      lastWatchedAt: dto.lastWatchedAt,
      completedAt: dto.completedAt,
    };
  }

  // Map backend DTO to frontend interface
  private mapToCourseProgress(dto: BackendCourseProgressDto, totalLessons?: number): CourseProgress {
    return {
      courseId: dto.courseId,
      totalLessons: totalLessons ?? dto.totalLessons,
      completedLessons: dto.completedLessons,
      progressPercentage: dto.progressPercentage,
      lastAccessedAt: dto.lastAccessedAt || new Date().toISOString(),
    };
  }

  // Update lesson progress
  async updateLessonProgress(
    lessonId: string,
    courseId: string,
    watchedDuration: number,
    totalDuration: number,
    isCompleted: boolean = false
  ): Promise<LessonProgress> {
    try {
      const response = await apiClient.put<BackendLessonProgressDto>('/progress/lesson', {
        lessonId,
        courseId,
        watchedDurationSeconds: watchedDuration,
        totalDurationSeconds: totalDuration,
        isCompleted,
      });

      return this.mapToLessonProgress(response);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to update lesson progress:', apiError);
      throw error;
    }
  }

  // Mark lesson as completed
  async markLessonCompleted(lessonId: string, courseId: string, totalDuration: number): Promise<LessonProgress> {
    try {
      const response = await apiClient.post<BackendLessonProgressDto>('/progress/lesson/complete', {
        lessonId,
        courseId,
        totalDurationSeconds: totalDuration,
      });

      return this.mapToLessonProgress(response);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to mark lesson as completed:', apiError);
      throw error;
    }
  }

  // Get progress for a specific lesson
  async getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
    try {
      const response = await apiClient.get<BackendLessonProgressDto>(`/progress/lesson/${lessonId}`);
      return this.mapToLessonProgress(response);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 404) {
        return null;
      }
      console.error('Failed to get lesson progress:', apiError);
      throw error;
    }
  }

  // Get all progress for a course
  async getCourseProgress(courseId: string, totalLessons?: number): Promise<CourseProgress> {
    try {
      const response = await apiClient.get<BackendCourseProgressDto>(`/progress/course/${courseId}`);
      return this.mapToCourseProgress(response, totalLessons);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to get course progress:', apiError);
      // Return default progress on error
      return {
        courseId,
        totalLessons: totalLessons || 0,
        completedLessons: 0,
        progressPercentage: 0,
        lastAccessedAt: new Date().toISOString(),
      };
    }
  }

  // Get continue watching lesson for a course
  async getContinueWatching(courseId: string): Promise<LessonProgress | null> {
    try {
      const response = await apiClient.get<BackendLessonProgressDto>(`/progress/course/${courseId}/continue`);
      return this.mapToLessonProgress(response);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 204 || apiError.status === 404) {
        return null;
      }
      console.error('Failed to get continue watching:', apiError);
      return null;
    }
  }

  // Clear progress for a course (useful for unenrollment)
  // Note: This would require a backend endpoint to delete progress
  clearCourseProgress(courseId: string): void {
    // This is now handled by the backend - progress is tied to enrollment
    // If needed, we could add a DELETE endpoint
    console.log('Progress clearing should be handled by backend when enrollment is removed');
  }

  // Get all progress for a course (all lessons)
  async getCourseLessonsProgress(courseId: string): Promise<LessonProgress[]> {
    try {
      const response = await apiClient.get<BackendLessonProgressDto[]>(`/progress/course/${courseId}/lessons`);
      return response.map(dto => this.mapToLessonProgress(dto));
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to get course lessons progress:', apiError);
      return [];
    }
  }
}

export const progressService = new ProgressService();










