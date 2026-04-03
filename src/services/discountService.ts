import { apiClient, type ApiError } from '../lib/api';

export interface DiscountDto {
  id: string;
  courseId: string;
  code?: string;
  type: 'Percentage' | 'FixedAmount';
  value: number;
  startsAt?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
}

export interface CreateDiscountRequest {
  courseId: string;
  code?: string;
  type: 'Percentage' | 'FixedAmount';
  value: number;
  startsAt?: string;
  expiresAt?: string;
  maxUses?: number;
}

export interface UpdateDiscountRequest extends Partial<CreateDiscountRequest> {
  isActive?: boolean;
}

export interface ValidateDiscountResponse {
  isValid: boolean;
  discountType?: string;
  discountValue?: number;
  originalPrice?: number;
  discountedPrice?: number;
  message?: string;
}

class DiscountService {
  async getCourseDiscounts(courseId: string): Promise<DiscountDto[]> {
    try {
      const response = await apiClient.get<DiscountDto[]>(`/discounts/course/${courseId}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch discounts');
    }
  }

  async createDiscount(request: CreateDiscountRequest): Promise<DiscountDto> {
    try {
      const response = await apiClient.post<DiscountDto>('/discounts', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to create discount';
      throw new Error(errorMessage);
    }
  }

  async updateDiscount(id: string, request: UpdateDiscountRequest): Promise<DiscountDto> {
    try {
      const response = await apiClient.put<DiscountDto>(`/discounts/${id}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update discount';
      throw new Error(errorMessage);
    }
  }

  async deleteDiscount(id: string): Promise<void> {
    try {
      await apiClient.delete(`/discounts/${id}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to delete discount';
      throw new Error(errorMessage);
    }
  }

  async validateDiscount(courseId: string, code: string): Promise<ValidateDiscountResponse> {
    try {
      const response = await apiClient.post<ValidateDiscountResponse>('/discounts/validate', {
        courseId,
        code,
      });
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to validate discount');
    }
  }
}

export const discountService = new DiscountService();
