import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

interface RoleGuardProps {
  allowedRole:
    | 'Student'
    | 'Teacher'
    | 'Instructor'
    | 'Admin'
    | 'Accountant'
    | 'Secretary'
  children: React.ReactNode
}

/**
 * RoleGuard - Enforces role-based access control
 * 
 * Behavior:
 * - Blocks access if user role doesn't match
 * - Redirects to correct portal root
 * - Shows loading state while resolving auth
 */
export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const location = useLocation()
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()
  const [isResolving, setIsResolving] = useState(true)

  useEffect(() => {
    // Ensure auth is initialized
    if (isLoading) {
      initialize()
    }
  }, [initialize, isLoading])

  useEffect(() => {
    // Wait for auth to initialize
    if (!isLoading) {
      setIsResolving(false)
    }
  }, [isLoading])

  // Show loading while resolving auth
  if (isResolving || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    const returnTo = location.pathname
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  // Normalize role names (backend uses "Instructor", frontend may use "Teacher")
  const userRoles = user.roles || []
  
  // Check if user is admin or superadmin
  const isAdminUser = userRoles.some(r => 
    r.toLowerCase() === 'admin' || r.toLowerCase() === 'superadmin'
  )
  
  // Pick highest-privilege role so multi-role users (e.g. Student + Admin) are not treated as Student only.
  const normalizedUserRole = (() => {
    const lower = userRoles.map((r) => r.toLowerCase())
    if (lower.some((r) => r === 'superadmin')) return 'superadmin'
    if (lower.some((r) => r === 'admin')) return 'admin'
    if (lower.some((r) => r === 'instructor' || r === 'teacher')) {
      return lower.find((r) => r === 'instructor' || r === 'teacher')!
    }
    if (lower.some((r) => r === 'student')) return 'student'
    return lower[0]
  })()

  const normalizedAllowedRole = allowedRole.toLowerCase()

  // Check if user has the required role
  const hasAccess =
    normalizedUserRole === normalizedAllowedRole ||
    (normalizedAllowedRole === 'teacher' && normalizedUserRole === 'instructor') ||
    (normalizedAllowedRole === 'instructor' && normalizedUserRole === 'teacher') ||
    (normalizedAllowedRole === 'admin' && isAdminUser) ||
    (normalizedAllowedRole === 'accountant' && normalizedUserRole === 'accountant') ||
    (normalizedAllowedRole === 'secretary' && normalizedUserRole === 'secretary') ||
    isAdminUser

  console.log('[RoleGuard] Access check:', { 
    userRoles, 
    normalizedUserRole, 
    normalizedAllowedRole, 
    isAdminUser,
    hasAccess 
  })

  if (!hasAccess) {
    // Redirect to correct portal based on user's role
    let redirectPath = '/login'
    
    if (normalizedUserRole === 'student') {
      redirectPath = '/student/dashboard'
    } else if (normalizedUserRole === 'instructor' || normalizedUserRole === 'teacher') {
      redirectPath = '/teacher/dashboard'
    } else if (normalizedUserRole === 'accountant') {
      redirectPath = '/accountant/dashboard'
    } else if (normalizedUserRole === 'secretary') {
      redirectPath = '/secretary/dashboard'
    } else if (
      normalizedUserRole === 'admin' ||
      normalizedUserRole === 'superadmin' ||
      isAdminUser
    ) {
      redirectPath = '/admin/dashboard'
    }

    return <Navigate to={redirectPath} replace />
  }

  // User has correct role - render children
  return <>{children}</>
}
