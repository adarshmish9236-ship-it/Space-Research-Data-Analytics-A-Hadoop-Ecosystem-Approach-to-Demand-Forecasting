import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Check, LogOut } from 'lucide-react'
import { useAuth, type UserRole, DEMO_CREDENTIALS } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

interface TopBarProps {
  wsConnected?: boolean
}

export default function TopBar({ wsConnected = false }: TopBarProps) {
  const { user, logout, switchDemoAccount } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRoleSwitch = async (role: UserRole) => {
    setDropdownOpen(false)
    try {
      await switchDemoAccount(role)
    } catch (err) {
      console.error('Failed to switch role:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header style={{
      height: 48,
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      flexShrink: 0,
      zIndex: 40,
    }}>
      {/* Left side: Simple System Status without blinking dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--color-text-dim)' }}>Stream:</span>
          <span style={{
            color: wsConnected ? 'var(--color-success)' : 'var(--color-text-dim)',
            fontWeight: 600,
          }}>
            {wsConnected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <span style={{ color: 'var(--color-border)' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-dim)' }}>
          <span>Cluster Master:</span>
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            yarn-master.space.internal
          </span>
        </div>
      </div>

      {/* Right side: Simple Theme Toggle & User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Simple Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
          title="Toggle color theme"
        >
          {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
        </button>

        {user ? (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '4px 8px',
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{user.name}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>({user.role})</span>
              <ChevronDown size={12} color="var(--color-text-dim)" />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                width: 220,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                padding: '6px',
                zIndex: 50,
              }}>
                <div style={{
                  padding: '4px 8px 6px',
                  fontSize: '0.65rem',
                  color: 'var(--color-text-dim)',
                  borderBottom: '1px solid var(--color-border-dim)',
                  marginBottom: 4,
                }}>
                  Switch Account
                </div>

                {(['ADMIN', 'ANALYST', 'VIEWER'] as UserRole[]).map((r) => {
                  const info = DEMO_CREDENTIALS[r]
                  const isCurrent = user.role === r
                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 4,
                        background: isCurrent ? 'var(--color-surface-2)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {info.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>
                          {r}
                        </div>
                      </div>
                      {isCurrent && <Check size={12} color="var(--color-accent)" />}
                    </button>
                  )
                })}

                <div style={{ height: 1, background: 'var(--color-border-dim)', margin: '4px 0' }} />

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 4,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-danger)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              background: 'var(--color-accent)',
              color: '#FFFFFF',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
}
