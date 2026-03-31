import { apiClient, type ApiError } from '../lib/api';

export interface ConversationDto {
  id: string;
  type: 'Direct' | 'Course' | 'General';
  courseId?: string;
  courseTitle?: string;
  title?: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessage?: ConversationMessageDto;
  participants: ConversationParticipantDto[];
  otherParticipant?: ConversationParticipantDto;
}

export interface ConversationParticipantDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  profilePictureUrl?: string;
  isInstructor: boolean;
  joinedAt: string;
  lastReadAt?: string;
}

export interface ConversationMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderProfilePictureUrl?: string;
  /** True when sender is Admin / SuperAdmin — show as platform staff */
  senderIsStaff?: boolean;
  content: string;
  sentAt: string;
  editedAt?: string;
  isDeleted: boolean;
}

export interface ConversationRequestDto {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterProfilePictureUrl?: string;
  receiverId: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  message?: string;
  requestedAt: string;
  respondedAt?: string;
}

export interface CreateConversationRequest {
  type: 'Direct' | 'Course';
  courseId?: string;
  otherUserId?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
}

export interface SendConversationRequestRequest {
  receiverId: string;
  message?: string;
}

/** Hub / older payloads may use PascalCase; REST API uses camelCase */
export function normalizeConversationMessageDto(
  m: ConversationMessageDto & { SenderIsStaff?: boolean }
): ConversationMessageDto {
  const raw = m as { senderIsStaff?: boolean; SenderIsStaff?: boolean }
  const senderIsStaff = raw.senderIsStaff ?? raw.SenderIsStaff
  return { ...m, senderIsStaff }
}

export interface BlockUserRequest {
  userId: string;
  reason?: string;
}

export interface ReportUserRequest {
  userId: string;
  reason: string;
  details?: string;
}

class ConversationService {
  async getConversations(): Promise<ConversationDto[]> {
    try {
      const response = await apiClient.get<ConversationDto[]>('/conversations');
      return response.map((c) => ({
        ...c,
        lastMessage: c.lastMessage ? normalizeConversationMessageDto(c.lastMessage) : undefined,
      }));
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch conversations');
    }
  }

  async getConversationById(conversationId: string): Promise<ConversationDto> {
    try {
      const response = await apiClient.get<ConversationDto>(`/conversations/${conversationId}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch conversation');
    }
  }

  async createConversation(request: CreateConversationRequest): Promise<ConversationDto> {
    try {
      const response = await apiClient.post<ConversationDto>('/conversations', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to create conversation');
    }
  }

  async getConversationMessages(
    conversationId: string,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Promise<ConversationMessageDto[]> {
    try {
      const params = new URLSearchParams();
      params.append('pageNumber', pageNumber.toString());
      params.append('pageSize', pageSize.toString());
      const response = await apiClient.get<ConversationMessageDto[]>(
        `/conversations/${conversationId}/messages?${params.toString()}`
      );
      return response.map(normalizeConversationMessageDto);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch messages');
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<ConversationMessageDto> {
    try {
      const response = await apiClient.post<ConversationMessageDto>(
        `/conversations/${request.conversationId}/messages`,
        request
      );
      return normalizeConversationMessageDto(response);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to send message');
    }
  }

  async markAsRead(conversationId: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/${conversationId}/read`);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to mark messages as read');
    }
  }

  async getCourseChat(courseId: string): Promise<ConversationDto> {
    try {
      const response = await apiClient.get<ConversationDto>(`/conversations/course/${courseId}`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to get course chat');
    }
  }

  async getPendingRequests(): Promise<ConversationRequestDto[]> {
    try {
      const response = await apiClient.get<ConversationRequestDto[]>('/conversations/requests/pending');
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to fetch pending requests');
    }
  }

  async sendRequest(request: SendConversationRequestRequest): Promise<ConversationRequestDto> {
    try {
      const response = await apiClient.post<ConversationRequestDto>('/conversations/requests', request);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to send conversation request');
    }
  }

  async acceptRequest(requestId: string): Promise<ConversationDto> {
    try {
      const response = await apiClient.post<ConversationDto>(`/conversations/requests/${requestId}/accept`);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to accept request');
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/requests/${requestId}/reject`);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to reject request');
    }
  }

  async blockUser(request: BlockUserRequest): Promise<void> {
    try {
      await apiClient.post('/conversations/block', request);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to block user');
    }
  }

  async unblockUser(userId: string): Promise<void> {
    try {
      await apiClient.post(`/conversations/unblock/${userId}`);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to unblock user');
    }
  }

  async reportUser(request: ReportUserRequest): Promise<void> {
    try {
      await apiClient.post('/conversations/report', request);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.error || 'Failed to report user');
    }
  }
}

export const conversationService = new ConversationService();











