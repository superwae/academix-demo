import { apiClient, type ApiError } from '../lib/api'
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  CreateOrganizationRequest,
  InviteMemberRequest,
  InvitePreview,
  OrgMemberRole,
  Organization,
  OrganizationMember,
  OrganizationSummary,
  UpdateOrganizationRequest,
} from '../types/organization'

function rethrow(error: unknown, fallback: string): never {
  const apiError = error as ApiError
  throw new Error(apiError?.error || fallback)
}

export const organizationService = {
  async getMine(): Promise<OrganizationSummary[]> {
    try {
      return await apiClient.get<OrganizationSummary[]>('/organizations/mine')
    } catch (e) {
      rethrow(e, 'Failed to load your organizations.')
    }
  },

  async getAll(): Promise<Organization[]> {
    try {
      return await apiClient.get<Organization[]>('/organizations')
    } catch (e) {
      rethrow(e, 'Failed to load organizations.')
    }
  },

  async getById(orgId: string): Promise<Organization> {
    try {
      return await apiClient.get<Organization>(`/organizations/${orgId}`)
    } catch (e) {
      rethrow(e, 'Failed to load organization.')
    }
  },

  async getBySlug(slug: string): Promise<Organization> {
    try {
      return await apiClient.get<Organization>(`/organizations/by-slug/${slug}`)
    } catch (e) {
      rethrow(e, 'Failed to load organization.')
    }
  },

  async create(request: CreateOrganizationRequest): Promise<Organization> {
    try {
      return await apiClient.post<Organization>('/organizations', request)
    } catch (e) {
      rethrow(e, 'Failed to create organization.')
    }
  },

  async update(orgId: string, request: UpdateOrganizationRequest): Promise<Organization> {
    try {
      return await apiClient.put<Organization>(`/organizations/${orgId}`, request)
    } catch (e) {
      rethrow(e, 'Failed to update organization.')
    }
  },

  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    try {
      return await apiClient.get<OrganizationMember[]>(`/organizations/${orgId}/members`)
    } catch (e) {
      rethrow(e, 'Failed to load members.')
    }
  },

  async inviteMember(orgId: string, request: InviteMemberRequest): Promise<OrganizationMember> {
    try {
      return await apiClient.post<OrganizationMember>(`/organizations/${orgId}/members/invite`, request)
    } catch (e) {
      rethrow(e, 'Failed to invite member.')
    }
  },

  async bulkInvite(orgId: string, members: InviteMemberRequest[]): Promise<OrganizationMember[]> {
    try {
      return await apiClient.post<OrganizationMember[]>(`/organizations/${orgId}/members/bulk`, { members })
    } catch (e) {
      rethrow(e, 'Failed to invite members.')
    }
  },

  async updateMemberRole(orgId: string, memberId: string, role: OrgMemberRole): Promise<OrganizationMember> {
    try {
      return await apiClient.put<OrganizationMember>(`/organizations/${orgId}/members/${memberId}/role`, { role })
    } catch (e) {
      rethrow(e, 'Failed to update member role.')
    }
  },

  async removeMember(orgId: string, memberId: string): Promise<void> {
    try {
      await apiClient.delete(`/organizations/${orgId}/members/${memberId}`)
    } catch (e) {
      rethrow(e, 'Failed to remove member.')
    }
  },

  async previewInvite(token: string): Promise<InvitePreview> {
    try {
      return await apiClient.get<InvitePreview>(`/organizations/invites/${encodeURIComponent(token)}`)
    } catch (e) {
      rethrow(e, 'Invitation not found.')
    }
  },

  async acceptInvite(request: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    try {
      return await apiClient.post<AcceptInviteResponse>('/organizations/invites/accept', request)
    } catch (e) {
      rethrow(e, 'Failed to accept invite.')
    }
  },
}
