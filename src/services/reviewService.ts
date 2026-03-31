import { apiClient, type ApiError } from '../lib/api';
import type { PagedRequest, PagedResult } from './courseService';

export interface ReviewDto {
  id: string;
  userId: string;
  userName: string;
  userProfilePictureUrl?: string;
  courseId: string;
  courseTitle: string;
  rating: number;
  comment?: string;
  isVisible: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateReviewRequest {
  courseId: string;
  rating: number; // 1-5
  comment?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  isVisible?: boolean;
}

class ReviewService {
  async getCourseReviews(courseId: string, request: PagedRequest = {}): Promise<PagedResult<ReviewDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/reviews/course/${courseId}?${queryString}` : `/reviews/course/${courseId}`;
      
      const response = await apiClient.get<PagedResult<ReviewDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch course reviews');
    }
  }

  async getMyReviews(request: PagedRequest = {}): Promise<PagedResult<ReviewDto>> {
    try {
      const params = new URLSearchParams();
      if (request.pageNumber) params.append('pageNumber', request.pageNumber.toString());
      if (request.pageSize) params.append('pageSize', request.pageSize.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/reviews/me?${queryString}` : '/reviews/me';
      
      const response = await apiClient.get<PagedResult<ReviewDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch my reviews');
    }
  }

  async getMyReviewForCourse(courseId: string): Promise<ReviewDto | null> {
    try {
      const response = await apiClient.get<ReviewDto>(`/reviews/course/${courseId}/my-review`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      // If review doesn't exist, return null instead of throwing
      if (apiError.error?.includes('not found') || apiError.status === 404) {
        return null;
      }
      throw new Error(apiError.error || 'Failed to fetch review');
    }
  }

  async getReviewById(id: string): Promise<ReviewDto> {
    try {
      const response = await apiClient.get<ReviewDto>(`/reviews/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch review');
    }
  }

  async createReview(request: CreateReviewRequest): Promise<ReviewDto> {
    try {
      const response = await apiClient.post<ReviewDto>('/reviews', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to create review';
      console.error('Create review error:', apiError);
      throw new Error(errorMessage);
    }
  }

  async updateReview(id: string, request: UpdateReviewRequest): Promise<ReviewDto> {
    try {
      const response = await apiClient.put<ReviewDto>(`/reviews/${id}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update review';
      console.error('Update review error:', apiError);
      throw new Error(errorMessage);
    }
  }

  async deleteReview(id: string): Promise<void> {
    try {
      await apiClient.delete(`/reviews/${id}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to delete review';
      console.error('Delete review error:', apiError);
      throw new Error(errorMessage);
    }
  }
}

export const reviewService = new ReviewService();

