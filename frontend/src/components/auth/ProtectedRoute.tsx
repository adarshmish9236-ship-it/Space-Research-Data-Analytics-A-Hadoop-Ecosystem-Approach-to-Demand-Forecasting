/**
 * ORBITALYTICS — ProtectedRoute
 * Wraps routes with auth + role-based access control
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If specified, user must have one of these roles */
  roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--color-bg)',
      }}>
        <div style={{
          width: 32, height: 32, border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && roles.length > 0 && !hasAnyRole(...roles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
