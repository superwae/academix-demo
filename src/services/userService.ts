import { apiClient, type ApiError } from '../lib/api';

export interface UserUiPreferences {
  theme: string;
  customThemeColor?: string | null;
  mixTheme?: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  roles: string[];
  uiPreferences?: UserUiPreferences | null;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isActive?: boolean;
}

class UserService {
  /** Current user profile including saved UI theme (synced across devices). */
  async getMe(): Promise<UserDto> {
    try {
      return await apiClient.get<UserDto>('/users/me');
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch profile');
    }
  }

  async updateUiPreferences(prefs: UserUiPreferences): Promise<UserDto> {
    try {
      return await apiClient.put<UserDto>('/users/me/ui-preferences', prefs);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to save theme preferences');
    }
  }

  async getCurrentUser(): Promise<UserDto> {
    try {
      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.get<UserDto>(`/users/${user.id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch user profile');
    }
  }

  async getUserById(id: string): Promise<UserDto> {
    try {
      const response = await apiClient.get<UserDto>(`/users/${id}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch user');
    }
  }

  async updateUser(id: string, request: UpdateUserRequest): Promise<UserDto> {
    try {
      const response = await apiClient.put<UserDto>(`/users/${id}`, request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to update user profile');
    }
  }

  async updateCurrentUser(request: UpdateUserRequest): Promise<UserDto> {
    try {
      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      return this.updateUser(user.id, request);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to update profile');
    }
  }

  async deleteCurrentUser(): Promise<void> {
    try {
      const { authService } = await import('./authService');
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      await apiClient.delete(`/users/${user.id}`);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to delete account');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to change password');
    }
  }
}

export const userService = new UserService();

