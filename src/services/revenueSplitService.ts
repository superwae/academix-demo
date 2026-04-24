import { apiClient, type ApiError } from '../lib/api'

export type RevenuePartyKind = 'Platform' | 'Organization' | 'Instructor'

export interface RevenueSplitPart {
  kind: RevenuePartyKind
  label: string
  percent: number
  amount: number
}

export interface RevenueSplitPreview {
  price: number
  currency: string
  parts: RevenueSplitPart[]
}

export interface PreviewSplitRequest {
  price: number
  organizationId?: string
  instructorId?: string
}

export interface TeacherEarningsSummary {
  year: number
  month: number
  currency: string
  grossSales: number
  platformCut: number
  orgCut: number
  netEarned: number
  salesCount: number
  courses: {
    courseId: string
    courseTitle: string
    salesCount: number
    grossSales: number
    netEarned: number
  }[]
  lifetimeGrossSales: number
  lifetimeNetEarned: number
  unpaidBalance: number
}

function rethrow(e: unknown, fallback: string): never {
  const err = e as ApiError
  throw new Error(err?.error || fallback)
}

export const revenueSplitService = {
  async preview(req: PreviewSplitRequest): Promise<RevenueSplitPreview> {
    try {
      return await apiClient.post<RevenueSplitPreview>('/courses/preview-split', req)
    } catch (e) {
      rethrow(e, 'Failed to preview split.')
    }
  },

  async getMyEarnings(year?: number, month?: number): Promise<TeacherEarningsSummary> {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    const query = params.toString()
    const url = query ? `/teachers/earnings/summary?${query}` : '/teachers/earnings/summary'
    try {
      return await apiClient.get<TeacherEarningsSummary>(url)
    } catch (e) {
      rethrow(e, 'Failed to load earnings.')
    }
  },
}
