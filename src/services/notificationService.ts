// Notifications service
// Uses API when authenticated, falls back to localStorage for offline/legacy

import { notificationApiService, type ApiNotification } from './notificationApiService';

export type NotificationType =
  | 'assignment'
  | 'exam'
  | 'announcement'
  | 'grade'
  | 'message'
  | 'deadline'
  | 'system'
  | 'admin';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string (optional)
}

function mapApiToNotification(api: ApiNotification): Notification {
  return {
    id: api.id,
    type: api.type as NotificationType,
    title: api.title,
    message: api.message,
    link: api.link,
    read: api.isRead,
    createdAt: api.createdAt,
    expiresAt: api.expiresAt,
  };
}

class NotificationService {
  private storageKey = 'academix_notifications';
  private maxNotifications = 100; // Limit stored notifications
  private cachedNotifications: Notification[] = [];
  private cachedUnreadCount = 0;
  private useApi = true;

  private getNotificationsData(): Notification[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveNotificationsData(notifications: Notification[]): void {
    if (typeof window === 'undefined') return;
    try {
      // Keep only the most recent notifications
      const limited = notifications.slice(0, this.maxNotifications);
      localStorage.setItem(this.storageKey, JSON.stringify(limited));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  // Create a new notification
  createNotification(
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    expiresAt?: string
  ): Notification {
    const notifications = this.getNotificationsData();
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: Notification = {
      id,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    notifications.unshift(notification); // Add to beginning
    this.saveNotificationsData(notifications);

    // Trigger browser notification if permission granted
    this.showBrowserNotification(title, message);

    return notification;
  }

  // Mark notification as read (sync for UI, async for API)
  markAsRead(notificationId: string): boolean {
    if (this.useApi) {
      notificationApiService.markAsRead(notificationId).catch(() => {});
      const n = this.cachedNotifications.find((x) => x.id === notificationId);
      if (n) n.read = true;
      this.cachedUnreadCount = Math.max(0, this.cachedUnreadCount - 1);
      return true;
    }
    const notifications = this.getNotificationsData();
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification) return false;
    notification.read = true;
    this.saveNotificationsData(notifications);
    return true;
  }

  // Mark all as read
  markAllAsRead(): void {
    if (this.useApi) {
      notificationApiService.markAllAsRead().catch(() => {});
      this.cachedNotifications.forEach((n) => (n.read = true));
      this.cachedUnreadCount = 0;
      return;
    }
    const notifications = this.getNotificationsData();
    notifications.forEach((n) => (n.read = true));
    this.saveNotificationsData(notifications);
  }

  // Delete a notification (API: remove from cache only; localStorage: persist)
  deleteNotification(notificationId: string): boolean {
    if (this.useApi) {
      const removed = this.cachedNotifications.find((n) => n.id === notificationId);
      this.cachedNotifications = this.cachedNotifications.filter((n) => n.id !== notificationId);
      if (removed && !removed.read) this.cachedUnreadCount = Math.max(0, this.cachedUnreadCount - 1);
      return true;
    }
    const notifications = this.getNotificationsData();
    const filtered = notifications.filter((n) => n.id !== notificationId);
    if (filtered.length === notifications.length) return false;
    this.saveNotificationsData(filtered);
    return true;
  }

  // Get all notifications (from cache when using API)
  getAllNotifications(): Notification[] {
    if (this.useApi) return this.cachedNotifications;
    const notifications = this.getNotificationsData();
    const now = new Date();
    const active = notifications.filter((n) => !n.expiresAt || new Date(n.expiresAt) > now);
    if (active.length !== notifications.length) this.saveNotificationsData(active);
    return active;
  }

  // Get unread count
  getUnreadCount(): number {
    if (this.useApi) return this.cachedUnreadCount;
    return this.getAllNotifications().filter((n) => !n.read).length;
  }

  /** Merge a server-pushed notification (SignalR) into the API cache without refetching the full list. */
  applyRealtimeNotification(api: ApiNotification): void {
    const mapped = mapApiToNotification(api);
    const idx = this.cachedNotifications.findIndex((n) => n.id === mapped.id);
    if (idx >= 0) {
      this.cachedNotifications[idx] = mapped;
    } else {
      this.cachedNotifications.unshift(mapped);
      if (this.cachedNotifications.length > this.maxNotifications) {
        this.cachedNotifications = this.cachedNotifications.slice(0, this.maxNotifications);
      }
    }
    this.useApi = true;
    this.cachedUnreadCount = this.cachedNotifications.filter((n) => !n.read).length;
  }

  // Load from API (call when user is authenticated)
  async loadFromApi(): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token || token.startsWith('mock-')) {
      this.useApi = false;
      return;
    }
    try {
      const [page, count] = await Promise.all([
        notificationApiService.getNotifications(1, 50),
        notificationApiService.getUnreadCount(),
      ]);
      this.cachedNotifications = (page.items || []).map(mapApiToNotification);
      this.cachedUnreadCount = count ?? 0;
      this.useApi = true;
    } catch {
      // API failed (backend down / network) - fall back to localStorage
      // Preserve any cached data we had so we don't lose it
      if (this.cachedNotifications.length > 0) {
        this.saveNotificationsData(this.cachedNotifications);
      }
      this.useApi = false;
    }
  }

  // Get unread notifications
  getUnreadNotifications(): Notification[] {
    return this.getAllNotifications().filter((n) => !n.read);
  }

  /** Current browser push permission (`denied` if unsupported) */
  getBrowserPushPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Request browser notification permission (must usually be called from a click handler)
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /** Show OS/browser banner when user has granted permission (e.g. after new API notification) */
  notifyBrowserIfPermitted(title: string, message: string): void {
    this.showBrowserNotification(title, message);
  }

  // Show browser notification
  private showBrowserNotification(title: string, message: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }

  // Create assignment due reminder
  createAssignmentReminder(assignmentTitle: string, courseTitle: string, dueDate: Date, assignmentId: string): Notification {
    const hoursUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    let message = '';

    if (hoursUntilDue < 24) {
      message = `Due in ${Math.round(hoursUntilDue)} hours`;
    } else {
      const days = Math.floor(hoursUntilDue / 24);
      message = `Due in ${days} day${days > 1 ? 's' : ''}`;
    }

    return this.createNotification(
      'assignment',
      `Assignment Due: ${assignmentTitle}`,
      `${courseTitle} - ${message}`,
      `/assignments/${assignmentId}`,
      dueDate.toISOString()
    );
  }

  // Create exam reminder
  createExamReminder(examTitle: string, courseTitle: string, startDate: Date, examId: string): Notification {
    const hoursUntilStart = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
    let message = '';

    if (hoursUntilStart < 24) {
      message = `Starts in ${Math.round(hoursUntilStart)} hours`;
    } else {
      const days = Math.floor(hoursUntilStart / 24);
      message = `Starts in ${days} day${days > 1 ? 's' : ''}`;
    }

    return this.createNotification(
      'exam',
      `Upcoming Exam: ${examTitle}`,
      `${courseTitle} - ${message}`,
      `/exams/${examId}`,
      startDate.toISOString()
    );
  }

  // Send notification to specific user (by email)
  // Note: Since notifications are stored in localStorage, this only works if the user is logged in
  sendNotificationToUser(
    userEmail: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      // Check if current user matches the target email
      // Use dynamic import to avoid circular dependencies
      let currentUser: any = null;
      try {
        // Try to get user from auth store using a lazy import
        const authStoreModule = (window as any).__authStore || null;
        if (authStoreModule) {
          currentUser = authStoreModule.getState().user;
        } else {
          // Fallback: try to get from localStorage directly
          const authData = localStorage.getItem('academix.auth');
          if (authData) {
            const parsed = JSON.parse(authData);
            currentUser = parsed?.state?.user || null;
          }
        }
      } catch (e) {
        console.warn('Could not access auth store:', e);
      }
      
      // Always store notification for the target user
      const userNotificationKey = `academix_notifications_${userEmail.toLowerCase()}`;
      const pendingNotifications = JSON.parse(localStorage.getItem(userNotificationKey) || '[]');
      
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        link,
        read: false,
        createdAt: new Date().toISOString(),
      };
      
      pendingNotifications.push(notification);
      localStorage.setItem(userNotificationKey, JSON.stringify(pendingNotifications));
      
      // If current user matches, also add to their current notifications immediately
      if (currentUser && currentUser.email && currentUser.email.toLowerCase() === userEmail.toLowerCase()) {
        this.createNotification(type, title, message, link);
        // Trigger update event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notificationUpdate'));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  // Load pending notifications for current user (legacy localStorage merge)
  loadPendingNotificationsForUser(userEmail: string): void {
    if (typeof window === 'undefined') return;
    try {
      const userNotificationKey = `academix_notifications_${userEmail.toLowerCase()}`;
      const pendingNotifications = JSON.parse(localStorage.getItem(userNotificationKey) || '[]');
      if (pendingNotifications.length > 0) {
        const currentNotifications = this.getNotificationsData();
        pendingNotifications.forEach((notif: Notification) => currentNotifications.unshift(notif));
        this.saveNotificationsData(currentNotifications);
        localStorage.removeItem(userNotificationKey);
      }
    } catch (error) {
      console.error('Error loading pending notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();

