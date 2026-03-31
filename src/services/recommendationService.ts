import { apiClient } from '../lib/api';
import type { CourseDto } from './courseService';

// Backend DTO types (match what the API actually returns)
export interface CourseRecommendationDto {
  courseId: string;
  title: string;
  description: string;
  category: string;
  level: string;
  thumbnailUrl?: string;
  rating: number;
  ratingCount: number;
  instructorName: string;
  price?: number;
  tags: string[];
  score: number;
  recommendationReason: string;
  type: string;
}

interface BackendRecommendationsResponse {
  forYou: CourseRecommendationDto[];
  trending: CourseRecommendationDto[];
  becauseYouEnrolled: CourseRecommendationDto[];
  newInYourField: CourseRecommendationDto[];
  fromYourInstructors: CourseRecommendationDto[];
}

// Frontend-friendly response (mapped to CourseDto format)
export interface RecommendationResponse {
  forYou: CourseDto[];
  trending: CourseDto[];
  similarToEnrolled: CourseDto[];
  fromYourInstructors: CourseDto[];
  newInYourField: CourseDto[];
  continueLearning: CourseDto[];
}

export interface SimilarCoursesResponse {
  courses: CourseDto[];
}

// Map CourseRecommendationDto to CourseDto format for frontend compatibility
function mapRecommendationToCourse(rec: CourseRecommendationDto): CourseDto {
  return {
    id: rec.courseId,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    level: rec.level,
    thumbnailUrl: rec.thumbnailUrl,
    rating: rec.rating,
    ratingCount: rec.ratingCount,
    instructorName: rec.instructorName,
    price: rec.price,
    tags: rec.tags || [],
    // Default values for fields not in recommendation DTO
    modality: 'Online',
    providerType: 'Business',
    providerName: 'AcademiX',
    instructorId: '',
    isFeatured: false,
    status: 'Published',
    sections: [],
    createdAt: new Date().toISOString(),
  };
}

class RecommendationService {
  /**
   * Get personalized course recommendations for the current user
   */
  async getRecommendations(limit: number = 10): Promise<RecommendationResponse> {
    console.log('[RecommendationService] Fetching recommendations...');
    const response = await apiClient.get<BackendRecommendationsResponse>(`/recommendations?limit=${limit}`);
    console.log('[RecommendationService] Raw API response:', JSON.stringify(response, null, 2));

    // Map backend DTOs to frontend CourseDto format
    const mapped = {
      forYou: (response?.forYou || []).map(mapRecommendationToCourse),
      trending: (response?.trending || []).map(mapRecommendationToCourse),
      similarToEnrolled: (response?.becauseYouEnrolled || []).map(mapRecommendationToCourse),
      fromYourInstructors: (response?.fromYourInstructors || []).map(mapRecommendationToCourse),
      newInYourField: (response?.newInYourField || []).map(mapRecommendationToCourse),
      continueLearning: [], // This endpoint is separate
    };
    console.log('[RecommendationService] Mapped forYou count:', mapped.forYou.length);
    return mapped;
  }

  /**
   * Get courses similar to a specific course
   */
  async getSimilarCourses(courseId: string, limit: number = 6): Promise<CourseDto[]> {
    const response = await apiClient.get<{ similarCourses: CourseRecommendationDto[] }>(`/recommendations/similar/${courseId}?limit=${limit}`);
    return (response?.similarCourses || []).map(mapRecommendationToCourse);
  }

  /**
   * Get trending courses based on recent enrollment activity
   */
  async getTrendingCourses(limit: number = 10): Promise<CourseDto[]> {
    console.log('[RecommendationService] Fetching trending courses...');
    const response = await apiClient.get<CourseRecommendationDto[]>(`/recommendations/trending?limit=${limit}`);
    console.log('[RecommendationService] Trending raw response:', JSON.stringify(response, null, 2));
    return (response || []).map(mapRecommendationToCourse);
  }

  /**
   * Get courses from instructors the user has previously enrolled with
   */
  async getFromYourInstructors(limit: number = 6): Promise<CourseDto[]> {
    const response = await apiClient.get<CourseRecommendationDto[]>(`/recommendations/from-instructors?limit=${limit}`);
    return (response || []).map(mapRecommendationToCourse);
  }

  /**
   * Get new courses in categories the user has shown interest in
   */
  async getNewInYourField(limit: number = 6): Promise<CourseDto[]> {
    const response = await apiClient.get<CourseRecommendationDto[]>(`/recommendations/new-in-field?limit=${limit}`);
    return (response || []).map(mapRecommendationToCourse);
  }

  /**
   * Get courses the user has started but not completed
   */
  async getContinueLearning(limit: number = 6): Promise<CourseDto[]> {
    const response = await apiClient.get<CourseRecommendationDto[]>(`/recommendations/continue-learning?limit=${limit}`);
    return (response || []).map(mapRecommendationToCourse);
  }
}

export const recommendationService = new RecommendationService();
