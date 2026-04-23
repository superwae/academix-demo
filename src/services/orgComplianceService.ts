import { apiClient, type ApiError } from '../lib/api'

export interface OrgComplianceSummary {
  totalAssignments: number
  activeAssignments: number
  completedAssignments: number
  overdueAssignments: number
  uniqueLearners: number
  averageProgressPercent: number
  completionRatePercent: number
}

export interface OrgAssignmentRow {
  enrollmentId: string
  userId: string
  userName: string
  userEmail: string
  courseId: string
  courseTitle: string
  courseLicenseId: string | null
  enrolledAt: string
  dueDate: string | null
  progressPercentage: number
  completedAt: string | null
  isOverdue: boolean
  status: string
}

export type ComplianceStatus = 'all' | 'active' | 'completed' | 'overdue'

function rethrow(e: unknown, fallback: string): never {
  const err = e as ApiError
  throw new Error(err?.error || fallback)
}

export const orgComplianceService = {
  async getSummary(orgId: string): Promise<OrgComplianceSummary> {
    try {
      return await apiClient.get<OrgComplianceSummary>(`/organizations/${orgId}/compliance/summary`)
    } catch (e) {
      rethrow(e, 'Failed to load compliance summary.')
    }
  },

  async getAssignments(orgId: string, status: ComplianceStatus = 'all'): Promise<OrgAssignmentRow[]> {
    try {
      const url =
        status === 'all'
          ? `/organizations/${orgId}/compliance/assignments`
          : `/organizations/${orgId}/compliance/assignments?status=${status}`
      return await apiClient.get<OrgAssignmentRow[]>(url)
    } catch (e) {
      rethrow(e, 'Failed to load assignments.')
    }
  },
}
