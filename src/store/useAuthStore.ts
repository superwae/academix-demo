import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type User } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  initialize: () => void;
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
          
          console.log('[Auth] Initializing:', { 
            hasUser: !!user, 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken,
            isAuthenticated 
          });
          
          set({ user, isAuthenticated, isLoading: false });
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        try {
          const response = await authService.login({ email, password });
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
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
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

