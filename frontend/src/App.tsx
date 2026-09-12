import { BrowserRouter, Routes, Route, NavLink, useLocation, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Database, Server, BarChart3,
  TrendingUp, Sliders, FileText, Lock, GitBranch,
  ShieldCheck, Radio, Globe
} from 'lucide-react'
import Overview from './pages/Overview'
import DataPipeline from './pages/DataPipeline'
import MissionAnalytics from './pages/MissionAnalytics'
import DemandForecast from './pages/DemandForecast'
import SpaceIntelligence from './pages/SpaceIntelligence'
import ScenarioLab from './pages/ScenarioLab'
import DataExplorer from './pages/DataExplorer'
import DataQuality from './pages/DataQuality'
import SystemMonitor from './pages/SystemMonitor'
import SpaceOperations from './pages/SpaceOperations'
import Reports from './pages/Reports'
import EarthView from './pages/EarthView'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import TopBar from './components/layout/TopBar'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useTelemetrySocket } from './services/useTelemetrySocket'

import { DecisionHub } from './pages/DecisionHub'
import { OptimizationLab } from './pages/OptimizationLab'
import { StressTestingLab } from './pages/StressTestingLab'
import { AIAnalyst } from './pages/AIAnalyst'
import { DigitalTwin } from './pages/DigitalTwin'
import { ModelGovernance } from './pages/ModelGovernance'
import { Orbitalytics2Unified } from './pages/Orbitalytics2Unified'
import { Sparkles } from 'lucide-react'

interface NavItem {
  to: string
  icon: any
  label: string
  requiredRoles?: ('ADMIN' | 'ANALYST' | 'VIEWER')[]
  badge?: string
}

const CORE_NAV_ITEMS: NavItem[] = [
  { to: '/',              icon: LayoutDashboard, label: 'Overview' },
  { to: '/pipeline',      icon: GitBranch,       label: 'Data Pipeline' },
  { to: '/forecast',      icon: TrendingUp,      label: 'Forecasting',        requiredRoles: ['ADMIN', 'ANALYST'] },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics',          requiredRoles: ['ADMIN', 'ANALYST'] },
  { to: '/scenarios',     icon: Sliders,         label: 'Scenario Lab',       requiredRoles: ['ADMIN', 'ANALYST'] },
  { to: '/data-explorer', icon: Database,        label: 'Data Explorer',      requiredRoles: ['ADMIN', 'ANALYST'] },
  { to: '/quality',       icon: ShieldCheck,     label: 'Data Quality',       requiredRoles: ['ADMIN', 'ANALYST'] },
  { to: '/hadoop',        icon: Server,          label: 'Hadoop Monitor',     requiredRoles: ['ADMIN'] },
  { to: '/space-ops',     icon: Radio,           label: 'Space Operations' },
  { to: '/earth-view',    icon: Globe,           label: 'Earth 3D' },
  { to: '/reports',       icon: FileText,        label: 'Reports & Briefings' },
]

const V2_NAV_ITEMS: NavItem[] = [
  { to: '/orbitalytics-2', icon: Sparkles, label: 'Unified 2.0 Suite', requiredRoles: ['ADMIN', 'ANALYST'], badge: '2.0 SUITE' },
]

function Sidebar() {
  const { user, hasAnyRole } = useAuth()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'var(--color-accent)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            O
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--color-text-primary)' }}>
              ORBITALYTICS
            </div>
            <div style={{ fontSize: '0.55rem', color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}>
              HADOOP SPACE INTELLIGENCE
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div style={{ marginBottom: '0.25rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.08em', padding: '0.5rem 0.75rem', textTransform: 'uppercase' }}>
            Modules
          </div>
        </div>
        {/* Core Modules */}
        {CORE_NAV_ITEMS.map(({ to, icon: Icon, label, requiredRoles }) => {
          const isPermitted = !requiredRoles || (user && hasAnyRole(...requiredRoles))

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{
                opacity: isPermitted ? 1 : 0.65,
              }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {!isPermitted && (
                <span title="Elevated role required" style={{ display: 'flex', alignItems: 'center' }}>
                  <Lock size={12} color="var(--color-text-dim)" />
                </span>
              )}
            </NavLink>
          )
        })}

        {/* ── ORBITALYTICS 2.0 SECTION AT THE BOTTOM ── */}
        <div style={{ marginTop: '1rem', marginBottom: '0.35rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--color-accent)',
            letterSpacing: '0.08em',
            padding: '0 0.75rem',
            textTransform: 'uppercase',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Sparkles size={11} /> Decision Intelligence 2.0
          </div>
        </div>

        {V2_NAV_ITEMS.map(({ to, icon: Icon, label, requiredRoles, badge }) => {
          const isPermitted = !requiredRoles || (user && hasAnyRole(...requiredRoles))

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{
                opacity: isPermitted ? 1 : 0.65,
                background: to === '/orbitalytics-2' ? 'rgba(0, 200, 232, 0.08)' : undefined,
                borderLeft: to === '/orbitalytics-2' ? '2px solid var(--color-accent)' : undefined,
              }}
            >
              <Icon size={15} color={to === '/orbitalytics-2' ? 'var(--color-accent)' : undefined} />
              <span style={{ flex: 1, fontWeight: to === '/orbitalytics-2' ? 700 : undefined, color: to === '/orbitalytics-2' ? 'var(--color-text-primary)' : undefined }}>
                {label}
              </span>
              {badge && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: to === '/orbitalytics-2' ? 'rgba(0, 200, 232, 0.25)' : 'rgba(56, 189, 248, 0.15)',
                  color: to === '/orbitalytics-2' ? '#00C8E8' : '#38bdf8',
                  border: '1px solid rgba(0, 200, 232, 0.4)',
                  marginRight: '2px'
                }}>
                  {badge}
                </span>
              )}
              {!isPermitted && (
                <span title="Elevated role required" style={{ display: 'flex', alignItems: 'center' }}>
                  <Lock size={12} color="var(--color-text-dim)" />
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.85rem', borderTop: '1px solid var(--color-border-dim)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
          <div>Apache Hadoop 3.3.4</div>
          <div>YARN • PySpark 3.5 • Hive</div>
          <div style={{ color: 'var(--color-accent)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            Lakehouse v2.0 • RBAC
          </div>
        </div>
      </div>
    </aside>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function AppLayout() {
  const { connected } = useTelemetrySocket()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{
        marginLeft: 220,
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
      }}>
        <TopBar wsConnected={connected} />
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Authenticated Application Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Overview / Mission Control - All Roles */}
              <Route path="/" element={<Overview />} />

              {/* ORBITALYTICS 2.0 Unified Suite & Decision Intelligence Routes */}
              <Route
                path="/orbitalytics-2"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <Orbitalytics2Unified />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/decision-hub"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <DecisionHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/optimization"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <OptimizationLab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stress-testing"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <StressTestingLab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai-analyst"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <AIAnalyst />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/digital-twin"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <DigitalTwin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/governance"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <ModelGovernance />
                  </ProtectedRoute>
                }
              />

              {/* Big Data Architecture Pipeline - All Roles */}
              <Route path="/pipeline" element={<DataPipeline />} />

              {/* Space Operations Deck - All Roles */}
              <Route path="/space-ops" element={<SpaceOperations />} />

              {/* Earth 3D View - All Roles */}
              <Route path="/earth-view" element={<EarthView />} />

              {/* Pattern Discovery - All Roles */}
              <Route path="/patterns" element={<SpaceIntelligence />} />

              {/* Reports & Briefings - All Roles */}
              <Route path="/reports" element={<Reports />} />

              {/* Restricted to ADMIN & ANALYST */}
              <Route
                path="/data-explorer"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <DataExplorer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quality"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <DataQuality />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <MissionAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forecast"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <DemandForecast />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scenarios"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <ScenarioLab />
                  </ProtectedRoute>
                }
              />

              {/* Hadoop Cluster & Infrastructure - ADMIN Only */}
              <Route
                path="/hadoop"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SystemMonitor />
                  </ProtectedRoute>
                }
              />

              {/* Compatibility Aliases */}
              <Route
                path="/missions"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <MissionAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route path="/intelligence" element={<SpaceIntelligence />} />
              <Route
                path="/explorer"
                element={
                  <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                    <DataExplorer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SystemMonitor />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
