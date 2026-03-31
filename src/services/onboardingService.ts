import { apiClient } from '../lib/api';

export interface OnboardingCategoryDto {
  id: string;
  name: string;
  description: string;
  icon: string;
  topics: string[];
}

export interface OnboardingCategoriesResponse {
  categories: OnboardingCategoryDto[];
  learningGoalOptions: string[];
  experienceLevels: string[];
}

export interface UserInterestDto {
  category: string;
  topics: string[];
  preferredLevel?: string;
  interestScore: number;
}

export interface SaveUserInterestsRequest {
  interests: UserInterestDto[];
  learningGoals: string[];
  experienceLevel?: string;
  weeklyTimeCommitment?: number;
}

export interface UserOnboardingDataResponse {
  interests: UserInterestDto[];
  learningGoals: string[];
  experienceLevel?: string;
  weeklyTimeCommitment?: number;
  onboardingCompleted: boolean;
  completedAt?: string;
}

export interface OnboardingStatusResponse {
  isCompleted: boolean;
  hasInterests: boolean;
  interestCount: number;
  completedAt?: string;
}

class OnboardingService {
  /**
   * Get available interest categories and topics for onboarding
   */
  async getCategories(): Promise<OnboardingCategoriesResponse> {
    return apiClient.get<OnboardingCategoriesResponse>('/onboarding/categories');
  }

  /**
   * Get the current user's interests
   */
  async getUserInterests(): Promise<UserOnboardingDataResponse> {
    return apiClient.get<UserOnboardingDataResponse>('/onboarding/interests');
  }

  /**
   * Save user interests during onboarding
   */
  async saveUserInterests(request: SaveUserInterestsRequest): Promise<void> {
    await apiClient.post('/onboarding/interests', request);
  }

  /**
   * Mark onboarding as complete for the current user
   */
  async completeOnboarding(): Promise<void> {
    await apiClient.post('/onboarding/complete');
  }

  /**
   * Check if user has completed onboarding
   */
  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    return apiClient.get<OnboardingStatusResponse>('/onboarding/status');
  }
}

export const onboardingService = new OnboardingService();
