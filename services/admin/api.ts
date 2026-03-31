/**
 * Admin API Service
 *
 * This file contains all API calls for the admin panel.
 * Currently uses mock data, but will be connected to the ASP.NET Core backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add auth token if available
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Users API
export const usersApi = {
  getAll: () => apiRequest<User[]>("/admin/users"),
  getById: (id: string) => apiRequest<User>(`/admin/users/${id}`),
  create: (data: Partial<User>) =>
    apiRequest<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<User>) =>
    apiRequest<User>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  suspend: (id: string) =>
    apiRequest<void>(`/admin/users/${id}/suspend`, { method: "POST" }),
  delete: (id: string) =>
    apiRequest<void>(`/admin/users/${id}`, { method: "DELETE" }),
};

// Courses API
export const coursesApi = {
  getAll: () => apiRequest<Course[]>("/admin/courses"),
  getById: (id: string) => apiRequest<Course>(`/admin/courses/${id}`),
  approve: (id: string) =>
    apiRequest<Course>(`/admin/courses/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    apiRequest<Course>(`/admin/courses/${id}/reject`, { method: "POST" }),
  update: (id: string, data: Partial<Course>) =>
    apiRequest<Course>(`/admin/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Roles API
export const rolesApi = {
  getAll: () => apiRequest<Role[]>("/admin/roles"),
  getById: (id: string) => apiRequest<Role>(`/admin/roles/${id}`),
  create: (data: Partial<Role>) =>
    apiRequest<Role>("/admin/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Role>) =>
    apiRequest<Role>(`/admin/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/admin/roles/${id}`, { method: "DELETE" }),
};

// Transactions API
export const transactionsApi = {
  getAll: () => apiRequest<Transaction[]>("/admin/transactions"),
  getById: (id: string) => apiRequest<Transaction>(`/admin/transactions/${id}`),
  refund: (id: string) =>
    apiRequest<Transaction>(`/admin/transactions/${id}/refund`, {
      method: "POST",
    }),
};

// Audit Logs API
export const auditLogsApi = {
  getAll: (params?: { page?: number; pageSize?: number; action?: string; targetType?: string }) =>
    apiRequest<{ data: AuditLog[]; total: number }>(`/admin/audit-logs${params ? `?${new URLSearchParams(params as any)}` : ""}`),
};

// System Settings API
export const systemApi = {
  getFeatureFlags: () => apiRequest<FeatureFlag[]>("/admin/system/feature-flags"),
  updateFeatureFlag: (id: string, enabled: boolean) =>
    apiRequest<FeatureFlag>(`/admin/system/feature-flags/${id}`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    }),
  getMaintenanceMode: () => apiRequest<{ enabled: boolean }>("/admin/system/maintenance"),
  setMaintenanceMode: (enabled: boolean) =>
    apiRequest<void>("/admin/system/maintenance", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    }),
};

// Reports API
export const reportsApi = {
  getUsersReport: (startDate: string, endDate: string) =>
    apiRequest<any>(`/admin/reports/users?start=${startDate}&end=${endDate}`),
  getRevenueReport: (startDate: string, endDate: string) =>
    apiRequest<any>(`/admin/reports/revenue?start=${startDate}&end=${endDate}`),
  getCoursesReport: (startDate: string, endDate: string) =>
    apiRequest<any>(`/admin/reports/courses?start=${startDate}&end=${endDate}`),
  exportCsv: (reportType: string, startDate: string, endDate: string) =>
    apiRequest<Blob>(`/admin/reports/export/csv?type=${reportType}&start=${startDate}&end=${endDate}`),
  exportPdf: (reportType: string, startDate: string, endDate: string) =>
    apiRequest<Blob>(`/admin/reports/export/pdf?type=${reportType}&start=${startDate}&end=${endDate}`),
};

// Type definitions for API responses
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "instructor" | "student" | "accountant" | "secretary";
  status: "active" | "suspended" | "pending";
  createdAt: string;
  lastLogin?: string;
}

interface Course {
  id: string;
  title: string;
  instructor: string;
  instructorId: string;
  enrollments: number;
  status: "published" | "draft" | "pending" | "rejected";
  price: number;
  category: string;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: { id: string; name: string; module: string }[];
}

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: "credit_card" | "paypal" | "bank_transfer";
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  actorId: string;
  target: string;
  targetType: "user" | "course" | "payment" | "system" | "role";
  details?: string;
  ipAddress: string;
  timestamp: string;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "general" | "experimental" | "beta";
}
