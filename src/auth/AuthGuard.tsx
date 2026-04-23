import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Minimal guard: redirects unauthenticated users to /login.
 * Does not enforce a specific role — use RoleGuard for that.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, isLoading, initialize } = useAuthStore()

  useEffect(() => {
    if (isLoading) initialize()
  }, [isLoading, initialize])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}
