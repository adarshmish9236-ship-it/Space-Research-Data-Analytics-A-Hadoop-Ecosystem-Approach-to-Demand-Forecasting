import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'
import {
  Lock, Activity, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Database,
  ArrowRight, ShieldCheck, Orbit, Globe, BarChart3,
  ChevronRight, Zap
} from 'lucide-react'

interface DemoAccount {
  role: UserRole
  name: string
  email: string
  title: string
  password: string
  clearance: string
  badgeColor: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    name: 'Sarah Vance',
    email: 'admin@orbitalytics.io',
    title: 'Mission Commander',
    password: 'admin2026',
    clearance: 'Level-4 Alpha',
    badgeColor: '#FF5E1E',
  },
  {
    role: 'ANALYST',
    name: 'Marcus Chen',
    email: 'analyst@orbitalytics.io',
    title: 'Lead Orbital Analyst',
    password: 'analyst2026',
    clearance: 'Level-3 Beta',
    badgeColor: '#00E5FF',
  },
  {
    role: 'VIEWER',
    name: 'Alex Rivera',
    email: 'viewer@orbitalytics.io',
    title: 'Flight Observer',
    password: 'viewer2026',
    clearance: 'Level-1 Gamma',
    badgeColor: '#10B981',
  },
]

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [email, setEmail] = useState('admin@orbitalytics.io')
  const [password, setPassword] = useState('admin2026')
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Live UTC Zulu clock
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toISOString().slice(11, 19) + ' UTC')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSelectRole = (account: DemoAccount) => {
    setEmail(account.email)
    setPassword(account.password)
    setSelectedRole(account.role)
    setError(null)
  }

  // Fast 1-click launch as Admin or specific route
  const handleQuickLaunch = async (targetRole: UserRole = 'ADMIN', targetPath?: string) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === targetRole) || DEMO_ACCOUNTS[0]
    setError(null)
    setLoading(true)
    try {
      await login(acc.email, acc.password)
      navigate(targetPath || from, { replace: true })
    } catch {
      setError('Unable to authenticate quick session.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Invalid credentials. Please verify email and password.'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#07080D',
      color: '#FFFFFF',
      fontFamily: "var(--font-sans, 'Plus Jakarta Sans', -apple-system, sans-serif)",
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Subtle Star & Glow Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 15% 20%, rgba(255, 94, 30, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 85% 30%, rgba(0, 229, 255, 0.07) 0%, transparent 45%),
          radial-gradient(circle at 50% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Grid Pattern Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.6,
      }} />

      {/* 1. Top Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 64,
        padding: '0 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(7, 8, 13, 0.85)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #FF5E1E, #E04A10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255,94,30,0.5)',
          }}>
            <Orbit size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.06em', color: '#FFFFFF' }}>
                ORBITALYTICS
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(255,94,30,0.15)',
                color: '#FF5E1E',
                border: '1px solid rgba(255,94,30,0.3)',
              }}>
                ENTERPRISE v2.4
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
              Big Data Space Intelligence Platform
            </div>
          </div>
        </div>

        {/* Live Cluster Health Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#A1A1AA' }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 10px #10B981',
              display: 'inline-block',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>HADOOP YARN: ONLINE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
            <Activity size={14} color="#FF5E1E" />
            <span>ZULU:</span>
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{utcTime || '18:00:00 UTC'}</span>
          </div>

          {/* Quick Demo Launch CTA in Top Bar */}
          <button
            type="button"
            onClick={() => handleQuickLaunch('ADMIN')}
            disabled={loading}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              background: 'rgba(255,94,30,0.12)',
              border: '1px solid rgba(255,94,30,0.4)',
              color: '#FF5E1E',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Zap size={13} />
            <span>QUICK DEMO ACCESS</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Section: Landing & Sign In */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 1240,
        width: '100%',
        margin: '0 auto',
        padding: '3rem 2rem 2.5rem 2rem',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.95fr',
        gap: '3.5rem',
        alignItems: 'center',
        flex: 1,
      }}>
        {/* Left Side: Product Showcase & Value Proposition */}
        <div>
          {/* Announcement Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 30,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '1.5rem',
          }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 12,
              background: '#FF5E1E',
              color: '#FFFFFF',
            }}>
              NEW
            </span>
            <span style={{ fontSize: '0.75rem', color: '#D4D4D8', fontWeight: 500 }}>
              Cinematic 3D Earth Orbit Tracking & PySpark Telemetry Engine
            </span>
            <ChevronRight size={14} color="#71717A" />
          </div>

          {/* Main Hero Headline */}
          <h1 style={{
            fontSize: '2.8rem',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: 0,
            color: '#FFFFFF',
          }}>
            Space Research Data Analytics: <br />
            <span style={{
              background: 'linear-gradient(135deg, #FF5E1E 0%, #FFA066 50%, #00E5FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              A Hadoop Ecosystem Approach to Demand Forecasting
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: '#9E9EA7',
            marginTop: '1.25rem',
            maxWidth: 560,
          }}>
            Ingest live satellite telemetry through Apache Kafka, manage distributed HDFS storage, run feature engineering on PySpark on YARN, and forecast space infrastructure capacity using Spark MLlib.
          </p>

          {/* Primary Quick Access Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLaunch('ADMIN')}
              disabled={loading}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #FF5E1E 0%, #E04A10 100%)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(255,94,30,0.35)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <span>ENTER MAIN DASHBOARD</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLaunch('ADMIN', '/earth-view')}
              disabled={loading}
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.15s ease',
              }}
            >
              <Globe size={16} color="#00E5FF" />
              <span>Explore 3D Earth</span>
            </button>
          </div>

          {/* Live Telemetry Metric Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginTop: '2.5rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                4,821
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 2 }}>
                Active Satellites (LEO/GEO)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00E5FF', fontFamily: 'var(--font-mono)' }}>
                1.48M/s
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 2 }}>
                PySpark Stream Throughput
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                4.82 PB
              </div>
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 2 }}>
                HDFS Distributed Storage
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: High-Tech Web App Login Card */}
        <div style={{
          background: 'rgba(17, 20, 30, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          padding: '2.25rem',
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.8), 0 0 40px rgba(255,94,30,0.08)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
        }}>
          {/* Card Top Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#FF5E1E',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono)',
              }}>
                GATEWAY SIGN IN
              </div>
              <h2 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: '2px 0 0 0',
                letterSpacing: '-0.02em',
              }}>
                Enter Mission Control
              </h2>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 6,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#10B981',
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}>
              <ShieldCheck size={13} />
              <span>TLS 1.3</span>
            </div>
          </div>

          {/* Role Quick Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#8E909B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-mono)',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>SELECT DEMO CLEARANCE</span>
              <span style={{ color: '#FF5E1E' }}>AUTOFILL</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedRole === acc.role
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectRole(acc)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(255,94,30,0.15)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #FF5E1E' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isSelected ? '#FF5E1E' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}>
                      {isSelected && <CheckCircle2 size={12} color="#FF5E1E" />}
                      <span>{acc.role}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#A1A1AA', marginTop: 2 }}>
                      {acc.name.split(' ')[0]}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: '#F87171',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: '1rem',
            }}>
              <AlertTriangle size={15} color="#F87171" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#D4D4D8',
                marginBottom: '0.35rem',
              }}>
                Operator Email
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="operator@orbitalytics.io"
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#FFFFFF',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#D4D4D8',
                }}>
                  Password
                </label>
                <span style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
                  AES-256 Validated
                </span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 38px 0 12px',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#FFFFFF',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.08em',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    color: '#71717A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#A1A1AA' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  style={{ accentColor: '#FF5E1E', cursor: 'pointer' }}
                />
                <span>Remember session</span>
              </label>
              <span style={{ fontSize: '0.7rem', color: '#FF5E1E', cursor: 'pointer' }} onClick={() => handleQuickLaunch('ADMIN')}>
                Demo Instant Login &rarr;
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                marginTop: '0.4rem',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #FF5E1E 0%, #E04A10 100%)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(255,94,30,0.3)',
                transition: 'opacity 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Lock size={14} />
              <span>{loading ? 'SIGNING IN...' : 'SIGN IN TO DASHBOARD'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div style={{
            marginTop: '1.25rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.7rem',
            color: '#71717A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
          }}>
            <span>SYSTEM: NOMINAL</span>
            <span style={{ color: '#10B981' }}>● YARN MASTER READY</span>
          </div>
        </div>
      </section>

      {/* 3. Platform Feature Highlights Section (Web App Landing Experience) */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 1240,
        width: '100%',
        margin: '0 auto',
        padding: '2rem 2rem 3.5rem 2rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#FF5E1E',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)',
          }}>
            INTEGRATED SUITE
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0 0' }}>
            Mission Operations Capabilities
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {/* Feature 1 */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid rgba(0,229,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Globe size={20} color="#00E5FF" />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              3D Earth Orbit Tracking
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#8E909B', lineHeight: 1.5, marginTop: '0.5rem' }}>
              Photorealistic WebGL globe with NASA Blue Marble shaders, atmospheric Rayleigh scattering, and real-time NORAD TLE constellation propagation.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(255,94,30,0.1)',
              border: '1px solid rgba(255,94,30,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Database size={20} color="#FF5E1E" />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Hadoop & PySpark Engine
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#8E909B', lineHeight: 1.5, marginTop: '0.5rem' }}>
              Petabyte-scale distributed storage on HDFS with Apache Spark 3.4.0 in-memory processing for real-time sensor analytics.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <BarChart3 size={20} color="#10B981" />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Conjunction & Collision Radar
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#8E909B', lineHeight: 1.5, marginTop: '0.5rem' }}>
              High-precision distance matrix computation and collision probability risk scoring to protect valuable satellite constellations.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        height: 50,
        padding: '0 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(7, 8, 13, 0.95)',
        fontSize: '0.75rem',
        color: '#71717A',
        fontFamily: 'var(--font-mono)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Apache Hadoop 3.3.4 (HDFS/YARN)</span>
          <span>•</span>
          <span>PySpark 3.4.0</span>
          <span>•</span>
          <span>Hive Metastore 3.1.3</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#10B981' }}>● System Nominal</span>
          <span>•</span>
          <span>ITAR / EAR Compliant</span>
          <span>•</span>
          <span>Orbitalytics Enterprise v2.4</span>
        </div>
      </footer>
    </div>
  )
}
