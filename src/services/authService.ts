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
  /** Theme settings from API — synced across devices when logged in */
  uiPreferences?: {
    theme: string;
    customThemeColor?: string | null;
    mixTheme?: string | null;
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

// Mock users for testing when backend is not available
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@academix.com': {
    password: 'Academix123!',
    user: {
      id: 'admin-001',
      email: 'admin@academix.com',
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      roles: ['Admin', 'SuperAdmin'],
    },
  },
  'teacher@academix.com': {
    password: 'Academix123!',
    user: {
      id: 'teacher-001',
      email: 'teacher@academix.com',
      firstName: 'John',
      lastName: 'Teacher',
      fullName: 'John Teacher',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      roles: ['Instructor'],
    },
  },
  'mohammad.omar@academix.com': {
    password: 'Academix123!',
    user: {
      id: 'mohammad-omar-001',
      email: 'mohammad.omar@academix.com',
      firstName: 'Mohammad',
      lastName: 'Omar',
      fullName: 'Mohammad Omar',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      roles: ['Instructor'],
    },
  },
  'student@academix.com': {
    password: 'Academix123!',
    user: {
      id: 'student-001',
      email: 'student@academix.com',
      firstName: 'Jane',
      lastName: 'Student',
      fullName: 'Jane Student',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      roles: ['Student'],
    },
  },
  'accountant@academix.com': {
    password: 'Academix123!',
    user: {
      id: 'accountant-001',
      email: 'accountant@academix.com',
      firstName: 'Accountant',
      lastName: 'Demo',
      fullName: 'Accountant Demo',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      roles: ['Accountant'],
    },
  },
  'secretary@academix.com': {
    password: 'Academix123!',
    user: {
      id: 'secretary-001',
      email: 'secretary@academix.com',
      firstName: 'Secretary',
      lastName: 'Demo',
      fullName: 'Secretary Demo',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      roles: ['Secretary'],
    },
  },
};

class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const mockUser = MOCK_USERS[request.email.toLowerCase()];

    // Try real API first - required for notifications and other backend features
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
      const isNetworkError = !apiError.status || apiError.status === 0 || apiError.status >= 500;
      /** Narrow: only staff demo emails — avoids masking real 401s for student/teacher/admin. */
      const dev401StaffDemo =
        import.meta.env.DEV &&
        apiError.status === 401 &&
        (request.email.toLowerCase() === 'accountant@academix.com' ||
          request.email.toLowerCase() === 'secretary@academix.com');

      const canUseMock =
        mockUser &&
        mockUser.password === request.password &&
        (isNetworkError || dev401StaffDemo);

      if (canUseMock) {
        console.log(
          '[Auth] Using mock login (offline or demo account not in DB):',
          request.email
        );
        const response: LoginResponse = {
          accessToken: 'mock-access-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          user: mockUser.user,
        };
        apiClient.setAccessToken(response.accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
      }

      if (mockUser) {
        throw new Error(apiError.error || 'Incorrect password. Try: Academix123!');
      }
      // Prefer `detail` when API returns it (e.g. Development exception info on 500)
      throw new Error(
        apiError.detail || apiError.error || apiError.title || 'Login failed'
      );
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
      throw new Error(apiError.error || 'Registration failed');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post<{ message?: string }>('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const apiError = await apiClient
      .post<{ message?: string }>('/auth/reset-password', { token, newPassword })
      .then(() => null)
      .catch((e) => e as ApiError);
    if (apiError) throw new Error(apiError.error || 'Failed to reset password');
  }

  async verifyEmail(token: string): Promise<void> {
    const apiError = await apiClient
      .post<{ message?: string }>('/auth/verify-email', { token })
      .then(() => null)
      .catch((e) => e as ApiError);
    if (apiError) throw new Error(apiError.error || 'Failed to verify email');
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const apiError = await apiClient
      .post<{ message?: string }>('/auth/resend-verification-email', { email })
      .then(() => null)
      .catch((e) => e as ApiError);
    if (apiError) throw new Error(apiError.error || 'Failed to resend verification email');
  }

  async refreshToken(): Promise<RefreshTokenResponse | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await apiClient.post<RefreshTokenResponse>(
        '/auth/refresh',
        { refreshToken }
      );
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
    // Consider authenticated if we have user and either access or refresh token
    return !!user && (!!accessToken || !!refreshToken);
  }
}

export const authService = new AuthService();

