import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AdminTheme = "light" | "dark" | "corporate";

interface AdminState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;

  // Theme
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;

  // Environment
  environment: "DEV" | "STAGING" | "PROD";

  // Notifications
  notifications: AdminNotification[];
  unreadNotificationsCount: number;
  addNotification: (notification: Omit<AdminNotification, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Global search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: Date;
  link?: string;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

      // Theme
      theme: "dark",
      setTheme: (theme) => set({ theme }),

      // Environment
      environment: "DEV",

      // Notifications
      notifications: [
        {
          id: "1",
          title: "New User Registration",
          message: "John Doe has registered as a student",
          type: "info",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
        },
        {
          id: "2",
          title: "Course Pending Approval",
          message: "Advanced React Patterns needs review",
          type: "warning",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30),
        },
        {
          id: "3",
          title: "Payment Received",
          message: "$299.00 from Sarah Wilson",
          type: "success",
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
        },
      ],
      unreadNotificationsCount: 2,
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              read: false,
            },
            ...state.notifications,
          ],
          unreadNotificationsCount: state.unreadNotificationsCount + 1,
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadNotificationsCount: Math.max(
            0,
            state.unreadNotificationsCount - 1
          ),
        })),
      clearNotifications: () =>
        set({ notifications: [], unreadNotificationsCount: 0 }),

      // Global search
      searchQuery: "",
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: "academix-admin-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
