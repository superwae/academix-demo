import { apiClient, type ApiError } from '../lib/api'

export type CourseLicenseStatus = 'Pending' | 'Active' | 'Expired' | 'Revoked'

export interface CourseLicense {
  id: string
  organizationId: string
  courseId: string
  courseTitle: string
  courseThumbnailUrl: string | null
  seatsTotal: number
  seatsUsed: number
  seatsAvailable: number
  pricePerSeat: number
  totalAmount: number
  currency: string
  validFrom: string | null
  validUntil: string | null
  status: CourseLicenseStatus
  createdAt: string
}

export interface LicenseAssignment {
  enrollmentId: string
  userId: string
  userName: string
  email: string
  enrolledAt: string
  dueDate: string | null
  progressPercentage: number
  completedAt: string | null
  status: string
}

export interface PurchaseLicenseRequest {
  courseId: string
  seats: number
  validUntil?: string
}

export interface AssignLicenseRequest {
  memberUserIds: string[]
  dueDate?: string
}

function rethrow(e: unknown, fallback: string): never {
  const err = e as ApiError
  throw new Error(err?.error || fallback)
}

export const courseLicenseService = {
  async list(orgId: string): Promise<CourseLicense[]> {
    try {
      return await apiClient.get<CourseLicense[]>(`/organizations/${orgId}/licenses`)
    } catch (e) {
      rethrow(e, 'Failed to load licenses.')
    }
  },

  async getById(orgId: string, licenseId: string): Promise<CourseLicense> {
    try {
      return await apiClient.get<CourseLicense>(`/organizations/${orgId}/licenses/${licenseId}`)
    } catch (e) {
      rethrow(e, 'Failed to load license.')
    }
  },

  async purchase(orgId: string, req: PurchaseLicenseRequest): Promise<CourseLicense> {
    try {
      return await apiClient.post<CourseLicense>(
        `/organizations/${orgId}/licenses/purchase`,
        req
      )
    } catch (e) {
      rethrow(e, 'Failed to purchase license.')
    }
  },

  async getAssignments(orgId: string, licenseId: string): Promise<LicenseAssignment[]> {
    try {
      return await apiClient.get<LicenseAssignment[]>(
        `/organizations/${orgId}/licenses/${licenseId}/assignments`
      )
    } catch (e) {
      rethrow(e, 'Failed to load assignments.')
    }
  },

  async assignSeats(orgId: string, licenseId: string, req: AssignLicenseRequest): Promise<LicenseAssignment[]> {
    try {
      return await apiClient.post<LicenseAssignment[]>(
        `/organizations/${orgId}/licenses/${licenseId}/assignments`,
        req
      )
    } catch (e) {
      rethrow(e, 'Failed to assign seats.')
    }
  },

  async revokeAssignment(orgId: string, licenseId: string, enrollmentId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/organizations/${orgId}/licenses/${licenseId}/assignments/${enrollmentId}`
      )
    } catch (e) {
      rethrow(e, 'Failed to revoke.')
    }
  },
}
