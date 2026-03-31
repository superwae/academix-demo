import { apiClient, type ApiError } from '../lib/api';

export type NotificationType =
  | 'assignment'
  | 'exam'
  | 'announcement'
  | 'grade'
  | 'message'
  | 'deadline'
  | 'system'
  | 'admin';

export interface ApiNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface PagedNotifications {
  items: ApiNotification[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

class NotificationApiService {
  async getNotifications(pageNumber = 1, pageSize = 50, unreadOnly?: boolean): Promise<PagedNotifications> {
    const params = new URLSearchParams();
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());
    if (unreadOnly !== undefined) params.append('unreadOnly', unreadOnly.toString());
    const response = await apiClient.get<PagedNotifications>(`/notifications?${params}`);
    return response;
  }

  async getUnreadCount(type?: string): Promise<number> {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    const q = params.toString();
    const response = await apiClient.get<number>(
      `/notifications/unread-count${q ? `?${q}` : ''}`
    );
    return response;
  }

  /** Marks all unread notifications of this type as read (e.g. `grade` after student sees new grades). */
  async markAsReadByType(type: string): Promise<number> {
    return await apiClient.put<number>(`/notifications/read-by-type/${encodeURIComponent(type)}`);
  }

  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await apiClient.put('/notifications/read-all');
  }
}

export const notificationApiService = new NotificationApiService();
