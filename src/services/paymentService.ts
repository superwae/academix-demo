import { apiClient, type ApiError } from '../lib/api';
import type { PagedResult } from './courseService';

export interface PaymentDto {
  id: string;
  userId: string;
  userName?: string;
  type: 'CoursePurchase' | 'Subscription' | 'Refund';
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | 'PartiallyRefunded';
  amount: number;
  currency: string;
  courseId?: string;
  courseTitle?: string;
  subscriptionId?: string;
  discountId?: string;
  lahzaReference?: string;
  paidAt?: string;
  createdAt: string;
}

export interface InitializeCoursePaymentRequest {
  courseId: string;
  discountCode?: string;
}

export interface InitializeCoursePaymentResponse {
  authorizationUrl: string;
  reference: string;
  amount: number;
  currency: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  payment: PaymentDto;
  enrollmentId?: string;
}

export interface PaymentSummaryDto {
  totalRevenue: number;
  totalTransactions: number;
  pendingPayouts: number;
  refunds: number;
  revenueByMonth: { month: string; amount: number }[];
}

class PaymentService {
  async initializeCoursePayment(request: InitializeCoursePaymentRequest): Promise<InitializeCoursePaymentResponse> {
    try {
      const response = await apiClient.post<InitializeCoursePaymentResponse>('/payments/initialize/course', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to initialize payment';
      throw new Error(errorMessage);
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    try {
      const response = await apiClient.get<PaymentVerifyResponse>(`/payments/verify/${reference}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to verify payment');
    }
  }

  async getMyPayments(page?: number, pageSize?: number): Promise<PagedResult<PaymentDto>> {
    try {
      const params = new URLSearchParams();
      if (page) params.append('pageNumber', page.toString());
      if (pageSize) params.append('pageSize', pageSize.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/payments/me?${queryString}` : '/payments/me';

      const response = await apiClient.get<PagedResult<PaymentDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch payments');
    }
  }

  async getAllPayments(page?: number, pageSize?: number): Promise<PagedResult<PaymentDto>> {
    try {
      const params = new URLSearchParams();
      if (page) params.append('pageNumber', page.toString());
      if (pageSize) params.append('pageSize', pageSize.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/payments?${queryString}` : '/payments';

      const response = await apiClient.get<PagedResult<PaymentDto>>(endpoint);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch payments');
    }
  }

  async getPaymentSummary(): Promise<PaymentSummaryDto> {
    try {
      const response = await apiClient.get<PaymentSummaryDto>('/payments/summary');
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch payment summary');
    }
  }

  async hasUserPaidForCourse(courseId: string): Promise<boolean> {
    try {
      const result = await this.getMyPayments(1, 100);
      return result.items.some(
        (payment) =>
          payment.courseId === courseId &&
          payment.type === 'CoursePurchase' &&
          payment.status === 'Completed'
      );
    } catch {
      return false;
    }
  }
}

export const paymentService = new PaymentService();
