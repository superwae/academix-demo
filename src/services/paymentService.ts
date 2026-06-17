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
  /** Section the student chose at checkout; the backend enrolls into it after payment. */
  sectionId?: string;
  discountCode?: string;
}

export interface InitializeSubscriptionPaymentRequest {
  planId: string;
  billingInterval: 'Monthly' | 'Yearly';
}

export interface InitializeCoursePaymentResponse {
  authorizationUrl: string;
  reference: string;
  amount: number;
  currency: string;
  /**
   * Local instant-gateway mode: when true the payment was completed server-side and
   * (for courses) the student is already enrolled / (for subscriptions) the
   * subscription is already active. No Lahza redirect should happen —
   * authorizationUrl will be empty.
   */
  demoCompleted?: boolean;
}

export interface PaymentVerifyResponse {
  success: boolean;
  payment: PaymentDto;
  enrollmentId?: string;
}

/** Mirrors backend PaymentSummaryDto. Amounts are in the smallest currency unit (agorot). */
export interface PaymentSummaryDto {
  totalRevenue: number;
  currency: string;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
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

  async initializeSubscriptionPayment(request: InitializeSubscriptionPaymentRequest): Promise<InitializeCoursePaymentResponse> {
    try {
      const response = await apiClient.post<InitializeCoursePaymentResponse>('/payments/initialize/subscription', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error || apiError.detail || apiError.title || 'Failed to initialize subscription payment';
      throw new Error(errorMessage);
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    try {
      const response = await apiClient.get<PaymentVerifyResponse | PaymentDto>(`/payments/verify/${reference}`);
      if ('payment' in response) {
        return response;
      }

      return {
        success: response.status === 'Completed',
        payment: response,
      };
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
