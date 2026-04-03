import { apiClient, type ApiError } from '../lib/api';
import type { SubscriptionPlanDto } from './subscriptionPlanService';

export interface SubscriptionDto {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  billingInterval: 'Monthly' | 'Yearly';
  status: 'Active' | 'PastDue' | 'Cancelled' | 'Expired' | 'Trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  plan: SubscriptionPlanDto;
}

export interface CanCreateCourseResponse {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed?: number;
}

export interface SubscribeRequest {
  planId: string;
  billingInterval: 'Monthly' | 'Yearly';
}

class SubscriptionService {
  async getMySubscription(): Promise<SubscriptionDto | null> {
    try {
      const response = await apiClient.get<SubscriptionDto>('/subscriptions/me');
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      // 404 means no active subscription
      if (apiError.status === 404) {
        return null;
      }
      throw new Error(apiError.error || 'Failed to fetch subscription');
    }
  }

  async canCreateCourse(): Promise<CanCreateCourseResponse> {
    try {
      const response = await apiClient.get<CanCreateCourseResponse>('/subscriptions/me/can-create-course');
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to check course creation eligibility');
    }
  }

  async subscribe(request: SubscribeRequest): Promise<SubscriptionDto> {
    try {
      const response = await apiClient.post<SubscriptionDto>('/subscriptions', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to subscribe';
      throw new Error(errorMessage);
    }
  }

  async cancelSubscription(): Promise<void> {
    try {
      await apiClient.delete('/subscriptions/me');
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to cancel subscription';
      throw new Error(errorMessage);
    }
  }
}

export const subscriptionService = new SubscriptionService();
