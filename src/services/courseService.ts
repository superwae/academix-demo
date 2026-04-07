import { apiClient, type ApiError } from '../lib/api';

export interface CourseDto {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  modality: string;
  providerType: string;
  providerName: string;
  instructorId: string;
  instructorName: string;
  rating: number;
  ratingCount: number;
  isFeatured: boolean;
  status: string;
  price?: number;
  thumbnailUrl?: string;
  tags: string[];
  sections: CourseSectionDto[];
  createdAt: string;
  /** Planned total instruction hours */
  expectedDurationHours?: number;
  /** Course run start (ISO) */
  courseStartDate?: string;
  /** Course run end (ISO) */
  courseEndDate?: string;
  /** Optional UI fields if API returns them */
  enrollmentLimit?: number;
  /** @deprecated use issueCertificates */
  certificateEnabled?: boolean;
  issueCertificates?: boolean;
  certificateSummary?: string | null;
  certificateDisplayHours?: number | null;
}

export interface CertificateSettingsPayload {
  issueCertificates: boolean;
  summary?: string | null;
  displayHours?: number | null;
}

export interface CourseSectionDto {
  id: string;
  courseId: string;
  name: string;
  locationLabel: string;
  joinUrl?: string;
  maxSeats: number;
  seatsRemaining: number;
  isActive: boolean;
  meetingTimes: MeetingTimeDto[];
}

export interface MeetingTimeDto {
  /** Present when returned from API; needed for session ratings */
  id?: string;
  day: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
}

export interface CreateSectionRequest {
  name: string;
  locationLabel: string;
  joinUrl?: string;
  maxSeats: number;
  meetingTimes?: { day: string; startMinutes: number; endMinutes: number }[];
}

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
}

export interface CloneCourseRequest {
  title?: string;
  courseStartDate?: string;
  courseEndDate?: string;
  copyLessons?: boolean;
  copyAssignments?: boolean;
  copyExams?: boolean;
  copySections?: boolean;
}

class CourseService {
  async getCourses(request: PagedRequest = {}): Promise<PagedResult<CourseDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/courses?${queryString}` : '/courses';
      
      const response = await apiClient.get<PagedResult<CourseDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch courses');
    }
  }

  async getFeaturedCourses(): Promise<CourseDto[]> {
    try {
      const response = await apiClient.get<CourseDto[]>('/courses/featured');
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to fetch featured courses';
      console.error('Get featured courses error:', apiError);
      throw new Error(errorMessage);
    }
  }

  async getCourseById(id: string): Promise<CourseDto> {
    try {
      const response = await apiClient.get<CourseDto>(`/courses/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch course');
    }
  }

  async getTopRatedCourses(limit: number = 10): Promise<CourseDto[]> {
    try {
      const response = await apiClient.get<PagedResult<CourseDto>>(
        `/courses?pageSize=${limit}&sortBy=rating&sortDescending=true`
      );
      return response.items;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to fetch top rated courses';
      console.error('Get top rated courses error:', apiError);
      throw new Error(errorMessage);
    }
  }

  async createCourse(request: {
    title: string;
    description: string;
    category: string;
    level: string;
    modality: string;
    providerType?: string;
    providerName?: string;
    price?: number;
    thumbnailUrl?: string;
    tags?: string[];
    instructorId?: string;
    sections?: CreateSectionRequest[];
    expectedDurationHours?: number;
    courseStartDate?: string;
    courseEndDate?: string;
    certificate?: CertificateSettingsPayload;
  }): Promise<CourseDto> {
    try {
      const response = await apiClient.post<CourseDto>('/courses', {
        title: request.title,
        description: request.description,
        category: request.category,
        level: request.level,
        modality: request.modality,
        providerType: request.providerType || 'Business',
        providerName: request.providerName || 'AcademiX',
        price: request.price,
        thumbnailUrl: request.thumbnailUrl,
        tags: request.tags || [],
        instructorId: request.instructorId,
        sections: request.sections ?? [],
        expectedDurationHours: request.expectedDurationHours,
        courseStartDate: request.courseStartDate,
        courseEndDate: request.courseEndDate,
        certificate: request.certificate,
      });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to create course';
      throw new Error(errorMessage);
    }
  }

  async updateCourse(courseId: string, request: {
    title?: string;
    description?: string;
    category?: string;
    level?: string;
    modality?: string;
    price?: number;
    thumbnailUrl?: string;
    tags?: string[];
    status?: string;
    expectedDurationHours?: number;
    courseStartDate?: string;
    courseEndDate?: string;
    certificate?: CertificateSettingsPayload;
  }): Promise<CourseDto> {
    try {
      const response = await apiClient.put<CourseDto>(`/courses/${courseId}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update course';
      throw new Error(errorMessage);
    }
  }

  async publishCourse(courseId: string): Promise<CourseDto> {
    try {
      const response = await apiClient.put<CourseDto>(`/courses/${courseId}`, {
        status: 'Published',
      });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to publish course';
      throw new Error(errorMessage);
    }
  }

  async addSection(courseId: string, request: CreateSectionRequest): Promise<CourseSectionDto> {
    try {
      const response = await apiClient.post<CourseSectionDto>(`/courses/${courseId}/sections`, {
        name: request.name,
        locationLabel: request.locationLabel,
        joinUrl: request.joinUrl,
        maxSeats: request.maxSeats ?? 999,
        meetingTimes: request.meetingTimes ?? [],
      });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to add section';
      throw new Error(errorMessage);
    }
  }

  async updateSection(
    courseId: string,
    sectionId: string,
    request: CreateSectionRequest
  ): Promise<void> {
    try {
      await apiClient.put(`/courses/${courseId}/sections/${sectionId}`, {
        name: request.name,
        locationLabel: request.locationLabel,
        joinUrl: request.joinUrl,
        maxSeats: request.maxSeats ?? 999,
        meetingTimes: request.meetingTimes ?? [],
      });
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update section';
      throw new Error(errorMessage);
    }
  }

  async deleteSection(courseId: string, sectionId: string): Promise<void> {
    try {
      await apiClient.delete(`/courses/${courseId}/sections/${sectionId}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to delete section';
      throw new Error(errorMessage);
    }
  }

  async cloneCourse(courseId: string, request: CloneCourseRequest = {}): Promise<CourseDto> {
    try {
      const response = await apiClient.post<CourseDto>(`/courses/${courseId}/clone`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to clone course';
      throw new Error(errorMessage);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    try {
      console.log('[CourseService] Attempting to delete course:', courseId);
      await apiClient.delete(`/courses/${courseId}`);
      console.log('[CourseService] Course deleted successfully');
    } catch (error) {
      const apiError = error as ApiError;
      console.error('[CourseService] Delete course error:', apiError);
      console.error('[CourseService] Full error object:', JSON.stringify(apiError, null, 2));
      
      // Get more detailed error message
      let errorMessage = apiError.detail || apiError.error || apiError.title || 'Failed to delete course';
      
      // If it's a 403 Forbidden, include debug info if available
      if (apiError.status === 403) {
        const debugInfo = (apiError as any).debug;
        if (debugInfo) {
          errorMessage += `\n\nDebug Info:\n- Your User ID: ${debugInfo.userId}\n- Course Instructor ID: ${debugInfo.courseInstructorId}\n- You own course: ${debugInfo.ownsCourse}\n- Your roles: ${debugInfo.userRoles?.join(', ') || 'NONE'}\n- Is Admin: ${debugInfo.isAdmin}\n- Is Instructor: ${debugInfo.isInstructor}`;
        } else {
          errorMessage = apiError.detail || apiError.error || 'You do not have permission to delete this course. Please ensure you are logged in as the course instructor and have the Instructor role.';
        }
      }
      
      console.error('[CourseService] Error message to display:', errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export const courseService = new CourseService();

