import { apiClient, type ApiError } from '../lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  /** 'Student' (default) or 'Instructor' for teachers */
  role?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  bio?: string;
  coverImageUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  roles: string[];
  /** Theme settings from API - synced across devices when logged in */
  uiPreferences?: {
    theme: string;
    customThemeColor?: string | null;
    mixTheme?: string | null;
    notificationsEnabled?: boolean | null;
  } | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', request);
      apiClient.setAccessToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.detail || apiError.error || apiError.title || 'Login failed');
    }
  }

  async register(request: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/register', request);
      apiClient.setAccessToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || apiError.detail || apiError.title || 'Registration failed');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post<{ message?: string }>('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const apiError = await apiClient
      .post<{ message?: string }>('/auth/reset-password', { token, newPassword })
      .then(() => null)
      .catch((error) => error as ApiError);
    if (apiError) throw new Error(apiError.error || apiError.detail || apiError.title || 'Failed to reset password');
  }

  async verifyEmail(token: string): Promise<void> {
    const apiError = await apiClient
      .post<{ message?: string }>('/auth/verify-email', { token })
      .then(() => null)
      .catch((error) => error as ApiError);
    if (apiError) throw new Error(apiError.error || apiError.detail || apiError.title || 'Failed to verify email');
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const apiError = await apiClient
      .post<{ message?: string }>('/auth/resend-verification-email', { email })
      .then(() => null)
      .catch((error) => error as ApiError);
    if (apiError) throw new Error(apiError.error || apiError.detail || apiError.title || 'Failed to resend verification email');
  }

  async refreshToken(): Promise<RefreshTokenResponse | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
      apiClient.setAccessToken(response.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      return response;
    } catch {
      this.logout();
      return null;
    }
  }

  logout() {
    apiClient.setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = this.getCurrentUser();
    return !!user && (!!accessToken || !!refreshToken);
  }
}

export const authService = new AuthService();
