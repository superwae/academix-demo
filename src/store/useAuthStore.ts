import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type User } from '../services/authService';
// Safe static import: useOrgStore does not import useAuthStore (no cycle).
import { useOrgStore } from './useOrgStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  initialize: () => void;
  /** Merge updates into the current user and sync to localStorage. */
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      initialize: () => {
        try {
          // Get user from localStorage
          const user = authService.getCurrentUser();
          // Check if we have both a token and user data
          const accessToken = localStorage.getItem('accessToken');
          const refreshToken = localStorage.getItem('refreshToken');
          
          // If we have user and at least refresh token, consider authenticated
          // The access token will be refreshed if needed
          const isAuthenticated = !!user && (!!accessToken || !!refreshToken);

          set({ user, isAuthenticated, isLoading: false });
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        try {
          const response = await authService.login({ email, password });
          // Fresh user: drop any org memberships cached for the previous account.
          useOrgStore.getState().clear();
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          void import('../theme/syncUserUiPreferences').then((m) =>
            m.applyServerUiPreferencesToStore(response.user.uiPreferences ?? null)
          );
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string, role?: string) => {
        try {
          const response = await authService.register({
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            role,
          });
          // Fresh user: drop any org memberships cached for the previous account.
          useOrgStore.getState().clear();
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          void import('../theme/syncUserUiPreferences').then((m) =>
            m.applyServerUiPreferencesToStore(response.user.uiPreferences ?? null)
          );
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        // Clear org memberships so the next user doesn't see the previous user's orgs.
        useOrgStore.getState().clear();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        // Reset theme to default so custom themes don't persist on public pages
        void import('../theme/applyTheme').then(({ applyTheme }) => {
          applyTheme('light');
        });
        // Reset the app store theme back to light
        void import('./useAppStore').then(({ useAppStore }) => {
          useAppStore.setState((s) => ({
            data: {
              ...s.data,
              theme: 'light' as const,
              customThemeColor: undefined,
              mixTheme: undefined,
            },
          }));
        });
      },

      updateUser: (updates: Partial<User>) => {
        const current = get().user;
        if (!current) return;
        const merged = { ...current, ...updates } as User;
        set({ user: merged });
        // Keep localStorage in sync so next page load sees the new avatar
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('user', JSON.stringify(merged));
          } catch {
            /* storage full / blocked — ignore */
          }
        }
      },

      refreshToken: async () => {
        try {
          const response = await authService.refreshToken();
          if (response) {
            // Token refreshed successfully
            const user = authService.getCurrentUser();
            set({ user, isAuthenticated: true });
          } else {
            // Refresh failed, logout
            get().logout();
          }
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'academix.auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

