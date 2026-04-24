import { useEffect } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
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
 *
 * Order of checks:
 *   1. auth still loading -> spinner
 *   2. not authenticated  -> /login (with returnTo so they come back here)
 *   3. memberships still loading -> spinner
 *   4. /org or /org/dashboard shortcut (no slug) -> redirect to user's first org (or home if none)
 *   5. slug unknown         -> redirect home
 *   6. role check           -> fallback to the org dashboard
 */
export function OrgGuard({ children, requireRole }: OrgGuardProps) {
  const { slug = '' } = useParams<{ slug: string }>()
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { memberships, membershipsLoaded, loadMemberships } = useOrgStore()

  useEffect(() => {
    if (!isLoading && isAuthenticated && !membershipsLoaded) {
      void loadMemberships()
    }
  }, [isLoading, isAuthenticated, membershipsLoaded, loadMemberships])

  if (isLoading) {
    return <Spinner />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }

  if (!membershipsLoaded) {
    return <Spinner />
  }

  // Shortcut: /org or /org/dashboard with no slug -> route to the user's primary org.
  if (!slug) {
    if (memberships.length === 0) return <Navigate to="/" replace />
    return <Navigate to={`/org/${memberships[0].slug}/dashboard`} replace />
  }

  const membership = memberships.find((m) => m.slug === slug)
  if (!membership) return <Navigate to="/" replace />

  if (requireRole && membership.roleInOrg !== 'OrgAdmin' && membership.roleInOrg !== requireRole) {
    return <Navigate to={`/org/${slug}/dashboard`} replace />
  }

  return <>{children}</>
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
