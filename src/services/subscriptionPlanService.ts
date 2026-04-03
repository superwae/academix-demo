import { apiClient, type ApiError } from '../lib/api';

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxCourses?: number;
  maxSeatsPerCourse?: number;
  maxTotalSeats?: number;
  featuresJson?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxCourses?: number;
  maxSeatsPerCourse?: number;
  maxTotalSeats?: number;
  featuresJson?: string;
  sortOrder?: number;
}

export interface UpdateSubscriptionPlanRequest extends Partial<CreateSubscriptionPlanRequest> {
  isActive?: boolean;
}

class SubscriptionPlanService {
  async getPlans(): Promise<SubscriptionPlanDto[]> {
    try {
      const response = await apiClient.get<SubscriptionPlanDto[]>('/subscriptionplans');
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch subscription plans');
    }
  }

  async getPlanById(id: string): Promise<SubscriptionPlanDto> {
    try {
      const response = await apiClient.get<SubscriptionPlanDto>(`/subscriptionplans/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch subscription plan');
    }
  }

  async createPlan(request: CreateSubscriptionPlanRequest): Promise<SubscriptionPlanDto> {
    try {
      const response = await apiClient.post<SubscriptionPlanDto>('/subscriptionplans', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to create subscription plan';
      throw new Error(errorMessage);
    }
  }

  async updatePlan(id: string, request: UpdateSubscriptionPlanRequest): Promise<SubscriptionPlanDto> {
    try {
      const response = await apiClient.put<SubscriptionPlanDto>(`/subscriptionplans/${id}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to update subscription plan';
      throw new Error(errorMessage);
    }
  }

  async deletePlan(id: string): Promise<void> {
    try {
      await apiClient.delete(`/subscriptionplans/${id}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to delete subscription plan';
      throw new Error(errorMessage);
    }
  }
}

export const subscriptionPlanService = new SubscriptionPlanService();
