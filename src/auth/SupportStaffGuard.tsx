import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

function isSupportStaffRole(roles: string[]): boolean {
  const lower = roles.map((r) => r.toLowerCase())
  return lower.some((r) => r === 'admin' || r === 'superadmin' || r === 'support')
}

/**
 * Allows Admin, SuperAdmin, and Support roles (support inbox / triage).
 */
export function SupportStaffGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()
  const [isResolving, setIsResolving] = useState(true)

  useEffect(() => {
    if (isLoading) initialize()
  }, [initialize, isLoading])

  useEffect(() => {
    if (!isLoading) setIsResolving(false)
  }, [isLoading])

  if (isResolving || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    const returnTo = location.pathname
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  if (!isSupportStaffRole(user.roles ?? [])) {
    const roles = user.roles ?? []
    const lower = roles.map((r) => r.toLowerCase())
    let redirectPath = '/student/dashboard'
    if (lower.some((r) => r === 'instructor' || r === 'teacher')) redirectPath = '/teacher/dashboard'
    else if (lower.some((r) => r === 'accountant')) redirectPath = '/accountant/dashboard'
    else if (lower.some((r) => r === 'secretary')) redirectPath = '/secretary/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}

/**
 * Admin portal guard: support-ticket routes allow Support staff; everything else requires Admin.
 */
export function AdminPortalGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isSupportTicketsPath = location.pathname.startsWith('/admin/support-tickets')

  if (isSupportTicketsPath) {
    return <SupportStaffGuard>{children}</SupportStaffGuard>
  }

  // Delegate to RoleGuard Admin via import — inline check to avoid circular deps
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()
  const [isResolving, setIsResolving] = useState(true)

  useEffect(() => {
    if (isLoading) initialize()
  }, [initialize, isLoading])

  useEffect(() => {
    if (!isLoading) setIsResolving(false)
  }, [isLoading])

  if (isResolving || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  }

  const isAdmin = (user.roles ?? []).some(
    (r) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'superadmin'
  )

  if (!isAdmin) {
    if (isSupportStaffRole(user.roles ?? [])) {
      return <Navigate to="/admin/support-tickets" replace />
    }
    return <Navigate to="/student/dashboard" replace />
  }

  return <>{children}</>
}
