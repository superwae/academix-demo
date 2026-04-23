import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useOrgStore } from '../store/useOrgStore'
import type { OrgMemberRole } from '../types/organization'

interface OrgGuardProps {
  children: React.ReactNode
  requireRole?: OrgMemberRole
}

/**
 * Gate a route behind membership in the org identified by the :slug URL param.
 * Optionally require a specific role (OrgAdmin outranks everything).
 */
export function OrgGuard({ children, requireRole }: OrgGuardProps) {
  const { slug = '' } = useParams<{ slug: string }>()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { memberships, membershipsLoaded, loadMemberships } = useOrgStore()

  useEffect(() => {
    if (!isLoading && isAuthenticated && !membershipsLoaded) {
      void loadMemberships()
    }
  }, [isLoading, isAuthenticated, membershipsLoaded, loadMemberships])

  if (isLoading || !membershipsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const membership = memberships.find((m) => m.slug === slug)
  if (!membership) return <Navigate to="/" replace />

  if (requireRole && membership.roleInOrg !== 'OrgAdmin' && membership.roleInOrg !== requireRole) {
    return <Navigate to={`/org/${slug}/dashboard`} replace />
  }

  return <>{children}</>
}
