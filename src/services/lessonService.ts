import { apiClient, type ApiError } from '../lib/api';
import { getDemoSections, getDemoLessons, getDemoLesson, isUIUXCourse } from '../data/demoLessons';

export interface CourseSectionDto {
  id: string;
  courseId: string;
  title: string;
  order: number;
  description?: string;
}

export interface LessonDto {
  id: string;
  courseId?: string;
  sectionId?: string | null;
  title: string;
  description?: string;
  videoUrl?: string;
  durationMinutes?: number;
  order: number;
  isPreview: boolean;
  /** Set for synthetic live-session rows; used for meeting-time ratings */
  sectionMeetingTimeId?: string;
}

class LessonService {
  // Store course context for demo lessons
  private courseContext: { courseId: string; courseTitle: string } | null = null;

  async getCourseSections(courseId: string): Promise<CourseSectionDto[]> {
    try {
      // Try the lesson sections endpoint first (for lesson organization)
      try {
        const response = await apiClient.get<CourseSectionDto[]>(`/lessons/sections/course/${courseId}`);
        return response;
      } catch (error) {
        // If endpoint doesn't exist, check if we have demo data for this course
        const apiError = error as ApiError;
        if (apiError.status === 405 || apiError.status === 404) {
          // Method Not Allowed or Not Found - endpoint doesn't exist
          const { courseService } = await import('./courseService');
          const course = await courseService.getCourseById(courseId);
          
          // Check if this is UI/UX Design Fundamentals course with demo lessons
          if (isUIUXCourse(courseId, course.title)) {
            // Store course context for demo lessons
            this.courseContext = { courseId, courseTitle: course.title };
            return getDemoSections(courseId, course.title);
          }
          
          // Clear context if not UI/UX course
          this.courseContext = null;
          
          // Otherwise, fall back to enrollment sections
          return course.sections
            .filter(s => s.isActive) // Only show active sections
            .map((section, index) => ({
              id: section.id,
              courseId: section.courseId,
              title: section.name, // Use name as title
              order: index + 1, // Use index as order
              description: section.locationLabel ? `Location: ${section.locationLabel}` : undefined,
            }));
        }
        throw error;
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to fetch course sections';
      console.error('Get course sections error:', apiError);
      throw new Error(errorMessage);
    }
  }

  /** All lessons for a course (including lessons not assigned to a LessonSection). */
  async getCourseLessons(courseId: string): Promise<LessonDto[]> {
    const response = await apiClient.get<LessonDto[]>(`/lessons/course/${courseId}`);
    return response;
  }

  async getSectionLessons(sectionId: string): Promise<LessonDto[]> {
    try {
      // Try the dedicated endpoint first
      try {
        const response = await apiClient.get<LessonDto[]>(`/lessons/section/${sectionId}`);
        return response;
      } catch (error) {
        // If endpoint doesn't exist, check if we have demo data
        const apiError = error as ApiError;
        if (apiError.status === 405 || apiError.status === 404) {
          // Method Not Allowed or Not Found - endpoint doesn't exist
          // Check if we have course context and if this is a demo section
          const demoSectionIds = ['section-1', 'section-2', 'section-3'];
          if (this.courseContext && demoSectionIds.includes(sectionId)) {
            // This is a demo section for UI/UX course
            return getDemoLessons(
              this.courseContext.courseId,
              this.courseContext.courseTitle,
              sectionId
            );
          }
          console.warn('Lessons endpoint not available, returning empty array');
          return [];
        }
        throw error;
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to fetch section lessons';
      console.error('Get section lessons error:', apiError);
      throw new Error(errorMessage);
    }
  }

  async getLessonById(lessonId: string): Promise<LessonDto> {
    try {
      // Validate lessonId format before making API call
      if (!lessonId || lessonId.trim() === '') {
        throw new Error('Lesson ID is required');
      }

      // Validate GUID format
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(lessonId)) {
        // If it's not a GUID, check if it's a demo lesson
        const demoLesson = getDemoLesson(lessonId);
        if (demoLesson) {
          console.log('Using demo lesson:', lessonId);
          return demoLesson;
        }
        throw new Error(`Invalid lesson ID format: "${lessonId}". The lesson may have been removed or the ID is corrupted.`);
      }

      // Try the dedicated endpoint first
      const response = await apiClient.get<LessonDto>(`/lessons/${lessonId}`);
      return response;
    } catch (error) {
      // If endpoint fails, check demo lessons as fallback
      const apiError = error as ApiError;
      console.log('API error fetching lesson, trying demo fallback:', apiError.status, apiError.error);
      
      // Check if this is a demo lesson (for demo courses)
      const demoLesson = getDemoLesson(lessonId);
      if (demoLesson) {
        console.log('Using demo lesson:', lessonId);
        return demoLesson;
      }
      
      // If not a demo lesson and it's a 404, provide a helpful error
      if (apiError.status === 404) {
        throw new Error('Lesson not found. The lesson may have been removed or does not exist in the database.');
      }

      // Handle validation errors (400 Bad Request)
      if (apiError.status === 400) {
        const validationError = apiError.error || apiError.detail || 'Invalid lesson ID format';
        throw new Error(`Validation failed: ${validationError}. The lesson ID may be invalid or corrupted.`);
      }
      
      // For other errors, throw the original error
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to fetch lesson';
      throw new Error(errorMessage);
    }
  }

  async createLesson(request: {
    courseId: string;
    sectionId?: string;
    title: string;
    description?: string;
    videoUrl?: string;
    durationMinutes?: number;
    order: number;
    isPreview?: boolean;
  }): Promise<LessonDto> {
    try {
      const response = await apiClient.post<LessonDto>('/lessons', {
        courseId: request.courseId,
        sectionId: request.sectionId,
        title: request.title,
        description: request.description,
        videoUrl: request.videoUrl,
        durationMinutes: request.durationMinutes,
        order: request.order,
        isPreview: request.isPreview || false,
      });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to create lesson';
      throw new Error(errorMessage);
    }
  }

  async updateLesson(lessonId: string, request: {
    title?: string;
    description?: string;
    videoUrl?: string;
    durationMinutes?: number;
    order?: number;
    isPreview?: boolean;
    sectionId?: string;
  }): Promise<LessonDto> {
    try {
      const response = await apiClient.put<LessonDto>(`/lessons/${lessonId}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update lesson';
      throw new Error(errorMessage);
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    try {
      await apiClient.delete(`/lessons/${lessonId}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to delete lesson';
      throw new Error(errorMessage);
    }
  }

  async createSection(request: {
    courseId: string;
    title: string;
    description?: string;
    order: number;
  }): Promise<CourseSectionDto> {
    try {
      const response = await apiClient.post<CourseSectionDto>('/lessons/sections', {
        courseId: request.courseId,
        title: request.title,
        description: request.description,
        order: request.order,
      });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to create section';
      throw new Error(errorMessage);
    }
  }

  async updateSection(sectionId: string, request: {
    title?: string;
    description?: string;
    order?: number;
  }): Promise<CourseSectionDto> {
    try {
      const response = await apiClient.put<CourseSectionDto>(`/lessons/sections/${sectionId}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update section';
      throw new Error(errorMessage);
    }
  }

  async deleteSection(sectionId: string): Promise<void> {
    try {
      await apiClient.delete(`/lessons/sections/${sectionId}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to delete section';
      throw new Error(errorMessage);
    }
  }
}

export const lessonService = new LessonService();

