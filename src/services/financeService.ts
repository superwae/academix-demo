import { apiClient, type ApiError } from "../lib/api";
import type { PagedResult } from "./courseService";

export interface FinanceTrendPointDto {
  period: string;
  periodStart: string;
  revenue: number;
  payoutLiability: number;
  refunds: number;
}

export interface FinanceCategoryDto {
  name: string;
  label: string;
  value: number;
  color: string;
}

export interface FinanceTopCourseDto {
  courseId: string;
  title: string;
  instructorName: string;
  revenue: number;
  payments: number;
  enrollments: number;
}

export interface FinancePayoutCourseDto {
  courseId: string;
  title: string;
  earnings: number;
  payments: number;
}

export interface FinancePayoutDto {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  avatar: string;
  grossAmount: number;
  platformFee: number;
  organizationShare: number;
  netAmount: number;
  courseCount: number;
  paymentCount: number;
  status: "pending" | "processing" | "completed" | "on_hold";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  courses: FinancePayoutCourseDto[];
}

export interface FinancePayoutSummaryDto {
  currency: string;
  pendingTotal: number;
  pendingCount: number;
  processingTotal: number;
  processingCount: number;
  completedTotal: number;
  completedCount: number;
  onHoldTotal: number;
  onHoldCount: number;
  uniqueInstructors: number;
}

export interface FinanceOverviewDto {
  currency: string;
  revenueTrend: FinanceTrendPointDto[];
  revenueByCategory: FinanceCategoryDto[];
  topCourses: FinanceTopCourseDto[];
  pendingPayouts: FinancePayoutDto[];
}

export interface FinanceInvoiceDto {
  invoiceNumber: string;
  paymentId: string;
  clientName: string;
  clientEmail: string;
  item: string;
  total: number;
  currency: string;
  status: "open" | "paid" | "failed" | "refunded";
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface FinanceInvoiceSummaryDto {
  currency: string;
  outstanding: number;
  collectedLast30Days: number;
  openCount: number;
  paidCount: number;
}

class FinanceService {
  async getOverview(): Promise<FinanceOverviewDto> {
    return this.get<FinanceOverviewDto>("/finance/overview", "Failed to fetch finance overview");
  }

  async getPayouts(page = 1, pageSize = 100, status?: string, searchTerm?: string): Promise<PagedResult<FinancePayoutDto>> {
    const params = new URLSearchParams({
      pageNumber: String(page),
      pageSize: String(pageSize),
    });
    if (status && status !== "all") params.set("status", status);
    if (searchTerm) params.set("searchTerm", searchTerm);
    return this.get<PagedResult<FinancePayoutDto>>(`/finance/payouts?${params}`, "Failed to fetch payouts");
  }

  async getPayoutSummary(): Promise<FinancePayoutSummaryDto> {
    return this.get<FinancePayoutSummaryDto>("/finance/payouts/summary", "Failed to fetch payout summary");
  }

  async getInvoices(page = 1, pageSize = 100, status?: string, searchTerm?: string): Promise<PagedResult<FinanceInvoiceDto>> {
    const params = new URLSearchParams({
      pageNumber: String(page),
      pageSize: String(pageSize),
    });
    if (status && status !== "all") params.set("status", status);
    if (searchTerm) params.set("searchTerm", searchTerm);
    return this.get<PagedResult<FinanceInvoiceDto>>(`/finance/invoices?${params}`, "Failed to fetch invoices");
  }

  async getInvoiceSummary(): Promise<FinanceInvoiceSummaryDto> {
    return this.get<FinanceInvoiceSummaryDto>("/finance/invoices/summary", "Failed to fetch invoice summary");
  }

  private async get<T>(endpoint: string, fallback: string): Promise<T> {
    try {
      return await apiClient.get<T>(endpoint);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || apiError.detail || apiError.title || fallback);
    }
  }
}

export const financeService = new FinanceService();
