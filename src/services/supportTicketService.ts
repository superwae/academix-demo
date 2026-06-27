import { apiClient, type ApiError } from '../lib/api'

export type SupportTicketCategory =
  | 'Billing'
  | 'Technical'
  | 'Course'
  | 'Account'
  | 'Feedback'
  | 'Other'

export type SupportTicketStatus =
  | 'Open'
  | 'InProgress'
  | 'WaitingOnUser'
  | 'Resolved'
  | 'Closed'

export type SupportTicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent'

export interface SupportTicket {
  id: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  message: string
  category: SupportTicketCategory
  status: SupportTicketStatus
  priority: SupportTicketPriority
  assignedToUserId: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string | null
  firstRespondedAt: string | null
  resolvedAt: string | null
  replyCount: number
}

export interface SupportTicketReply {
  id: string
  ticketId: string
  authorUserId: string
  authorName: string
  authorProfilePictureUrl: string | null
  message: string
  isInternal: boolean
  isStaff: boolean
  createdAt: string
}

export interface SupportTicketDetail {
  ticket: SupportTicket
  replies: SupportTicketReply[]
}

export interface CreateSupportTicketRequest {
  subject: string
  message: string
  category: SupportTicketCategory
}

export interface CreateReplyRequest {
  message: string
  isInternal?: boolean
}

export interface UpdateTicketRequest {
  status?: SupportTicketStatus
  priority?: SupportTicketPriority
  assignedToUserId?: string | null
}

export interface SupportStaffMember {
  id: string
  name: string
  email: string
}

export type SupportInboxQueue = 'all' | 'mine' | 'unassigned'

function rethrow(e: unknown, fallback: string): never {
  const err = e as ApiError
  throw new Error(err?.error || fallback)
}

export const supportTicketService = {
  async getMine(): Promise<SupportTicket[]> {
    try {
      return await apiClient.get<SupportTicket[]>('/support/tickets/mine')
    } catch (e) {
      rethrow(e, 'Failed to load tickets.')
    }
  },

  async getAll(options?: {
    status?: SupportTicketStatus
    queue?: SupportInboxQueue
  }): Promise<SupportTicket[]> {
    try {
      const params = new URLSearchParams()
      if (options?.status) params.set('status', options.status)
      if (options?.queue === 'mine') params.set('assignedToMe', 'true')
      if (options?.queue === 'unassigned') params.set('unassigned', 'true')
      const qs = params.toString()
      const url = qs ? `/support/tickets?${qs}` : '/support/tickets'
      return await apiClient.get<SupportTicket[]>(url)
    } catch (e) {
      rethrow(e, 'Failed to load tickets.')
    }
  },

  async getStaff(): Promise<SupportStaffMember[]> {
    try {
      return await apiClient.get<SupportStaffMember[]>('/support/tickets/staff')
    } catch (e) {
      rethrow(e, 'Failed to load support staff.')
    }
  },

  async getById(ticketId: string): Promise<SupportTicketDetail> {
    try {
      return await apiClient.get<SupportTicketDetail>(`/support/tickets/${ticketId}`)
    } catch (e) {
      rethrow(e, 'Failed to load ticket.')
    }
  },

  async create(req: CreateSupportTicketRequest): Promise<SupportTicket> {
    try {
      return await apiClient.post<SupportTicket>('/support/tickets', req)
    } catch (e) {
      rethrow(e, 'Failed to create ticket.')
    }
  },

  async addReply(ticketId: string, req: CreateReplyRequest): Promise<SupportTicketReply> {
    try {
      return await apiClient.post<SupportTicketReply>(
        `/support/tickets/${ticketId}/replies`,
        { message: req.message, isInternal: req.isInternal ?? false }
      )
    } catch (e) {
      rethrow(e, 'Failed to post reply.')
    }
  },

  async update(ticketId: string, req: UpdateTicketRequest): Promise<SupportTicket> {
    try {
      return await apiClient.patch<SupportTicket>(`/support/tickets/${ticketId}`, req)
    } catch (e) {
      rethrow(e, 'Failed to update ticket.')
    }
  },
}
