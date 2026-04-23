import { create } from 'zustand'
import { organizationService } from '../services/organizationService'
import type { Organization, OrganizationSummary } from '../types/organization'

interface OrgState {
  memberships: OrganizationSummary[]
  membershipsLoaded: boolean
  loadingMemberships: boolean
  currentOrg: Organization | null
  currentSlug: string | null
  loadingCurrent: boolean
  loadMemberships: () => Promise<void>
  loadOrg: (slug: string) => Promise<void>
  clear: () => void
}

export const useOrgStore = create<OrgState>((set, get) => ({
  memberships: [],
  membershipsLoaded: false,
  loadingMemberships: false,
  currentOrg: null,
  currentSlug: null,
  loadingCurrent: false,

  async loadMemberships() {
    if (get().loadingMemberships) return
    set({ loadingMemberships: true })
    try {
      const memberships = await organizationService.getMine()
      set({ memberships, membershipsLoaded: true })
    } catch {
      set({ memberships: [], membershipsLoaded: true })
    } finally {
      set({ loadingMemberships: false })
    }
  },

  async loadOrg(slug: string) {
    if (get().currentSlug === slug && get().currentOrg) return
    set({ loadingCurrent: true, currentSlug: slug })
    try {
      const org = await organizationService.getBySlug(slug)
      set({ currentOrg: org })
    } catch {
      set({ currentOrg: null })
    } finally {
      set({ loadingCurrent: false })
    }
  },

  clear() {
    set({
      memberships: [],
      membershipsLoaded: false,
      currentOrg: null,
      currentSlug: null,
    })
  },
}))
