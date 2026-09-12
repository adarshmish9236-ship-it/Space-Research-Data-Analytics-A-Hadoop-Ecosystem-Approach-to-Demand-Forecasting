/**
 * ORBITALYTICS — Auth Context
 * JWT-based authentication with RBAC (ADMIN, ANALYST, VIEWER)
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  token: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  switchDemoAccount: (role: UserRole) => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
  hasAnyRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'orbitalytics_auth'

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; name: string }> = {
  ADMIN: { email: 'admin@orbitalytics.io', pass: 'admin2026', name: 'Mission Commander' },
  ANALYST: { email: 'analyst@orbitalytics.io', pass: 'analyst2026', name: 'Data Analyst' },
  VIEWER: { email: 'viewer@orbitalytics.io', pass: 'viewer2026', name: 'Mission Observer' },
}

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  ANALYST: [
    '/', '/analytics', '/patterns', '/forecast', '/scenarios',
    '/data-explorer', '/reports', '/missions', '/intelligence',
    '/explorer',
  ],
  VIEWER: [
    '/', '/reports',
  ],
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser
        // Validate token expiry
        const tokenParts = parsed.token.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))
          if (payload.exp * 1000 > Date.now()) {
            setUser(parsed)
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Invalid credentials')
      }
      const data = await res.json()
      const authUser: AuthUser = {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        token: data.access_token,
      }
      setUser(authUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    } catch (err) {
      throw err
    }
  }, [])

  const switchDemoAccount = useCallback(async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role]
    if (creds) {
      await login(creds.email, creds.pass)
    }
  }, [login])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const hasAnyRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return roles.some(r => user.role === r)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      switchDemoAccount,
      hasRole,
      hasAnyRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
