import { apiClient, type ApiError } from "../lib/api";
import type { PagedResult } from "./courseService";

export interface AuditLogDto {
  id: string;
  action: string;
  category: string;
  actor: string;
  actorRole: string;
  target: string;
  description: string;
  ipAddress: string;
  status: "success" | "warning" | "error";
  method: string;
  path: string;
  timestamp: string;
}

export interface AuditLogSummaryDto {
  totalEvents: number;
  todayEvents: number;
  failedActions: number;
}

class AuditLogService {
  async getAuditLogs(page = 1, pageSize = 100, category?: string, searchTerm?: string): Promise<PagedResult<AuditLogDto>> {
    const params = new URLSearchParams({
      pageNumber: String(page),
      pageSize: String(pageSize),
    });
    if (category && category !== "all") params.set("category", category);
    if (searchTerm) params.set("searchTerm", searchTerm);
    return this.get<PagedResult<AuditLogDto>>(`/audit-logs?${params}`, "Failed to fetch audit logs");
  }

  async getSummary(): Promise<AuditLogSummaryDto> {
    return this.get<AuditLogSummaryDto>("/audit-logs/summary", "Failed to fetch audit summary");
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

export const auditLogService = new AuditLogService();
