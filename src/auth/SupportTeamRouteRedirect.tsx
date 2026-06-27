import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { isPlatformAdminAccount } from '../lib/userRoles'

/**
 * Legacy /support-team/* URLs → admin portal (existing shell).
 * Full admins go to the admin dashboard; Support-only staff go to the admin support inbox.
 */
export function SupportTeamRouteRedirect() {
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  const ticketMatch = pathname.match(/^\/support-team\/tickets\/([^/]+)\/?$/)
  if (ticketMatch) {
    return <Navigate to={`/admin/support-tickets/${ticketMatch[1]}`} replace />
  }

  if (isPlatformAdminAccount(user?.roles)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Navigate to="/admin/support-tickets" replace />
}
