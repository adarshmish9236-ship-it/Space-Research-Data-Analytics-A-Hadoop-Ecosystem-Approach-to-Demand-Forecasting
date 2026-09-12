import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  SlidersHorizontal,
  Flame,
  BrainCircuit,
  Activity,
  Award,
  ShieldAlert
} from 'lucide-react'

import { DecisionHub } from './DecisionHub'
import { OptimizationLab } from './OptimizationLab'
import { StressTestingLab } from './StressTestingLab'
import { AIAnalyst } from './AIAnalyst'
import { DigitalTwin } from './DigitalTwin'
import { ModelGovernance } from './ModelGovernance'
import { apiService } from '../services/api'

type TabType = 'decision' | 'optimization' | 'stress' | 'analyst' | 'twin' | 'governance'

interface TabConfig {
  id: TabType
  label: string
  tag: string
  subtitle: string
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>
  color: string
  gradient: string
}

const TABS: TabConfig[] = [
  {
    id: 'decision',
    label: 'Decision Hub',
    tag: '5-Q COCKPIT',
    subtitle: 'Executive 5-Question Cockpit & Prescriptions',
    icon: Sparkles,
    color: '#00E5FF',
    gradient: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 114, 255, 0.05) 100%)',
  },
  {
    id: 'optimization',
    label: 'Resource Optimizer',
    tag: 'INTERIOR-POINT',
    subtitle: 'Multi-Resource Capacity Reallocation',
    icon: SlidersHorizontal,
    color: '#10B981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.05) 100%)',
  },
  {
    id: 'stress',
    label: 'Stress Testing',
    tag: '8 CRISES',
    subtitle: 'Resilience Bounds & Risk Decomposer',
    icon: Flame,
    color: '#FF5E1E',
    gradient: 'linear-gradient(135deg, rgba(255, 94, 30, 0.2) 0%, rgba(220, 38, 38, 0.05) 100%)',
  },
  {
    id: 'analyst',
    label: 'AI Analyst',
    tag: '0% HALLUCINATION',
    subtitle: 'Deterministic Aerospace Query Trace',
    icon: BrainCircuit,
    color: '#38BDF8',
    gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(37, 99, 235, 0.05) 100%)',
  },
  {
    id: 'twin',
    label: 'Digital Twin 2.0',
    tag: 'SPACE-TO-GROUND',
    subtitle: 'Interconnected Topological State',
    icon: Activity,
    color: '#FBBF24',
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(217, 119, 6, 0.05) 100%)',
  },
  {
    id: 'governance',
    label: 'Model Governance',
    tag: 'MCDA 2.0 & LINEAGE',
    subtitle: 'MCDA Trust Scoring & 10-Node Lineage',
    icon: Award,
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 206, 0.05) 100%)',
  },
]

export const Orbitalytics2Unified: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabType) || 'decision'
  const [activeTab, setActiveTabState] = useState<TabType>(initialTab)

  // Live Executive Telemetry Feed
  const [telemetry, setTelemetry] = useState({
    riskScore: 60.0,
    riskTier: 'ELEVATED',
    championModel: 'Gradient Boosted Trees (GBT)',
    twinNodesCount: 10,
    syncTime: 'Live',
    sparkVcores: '64 / 96 Active',
    hdfsUsed: '42.6 / 120 TB'
  })

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const [riskRes, twinRes, govRes] = await Promise.allSettled([
          apiService.riskScore(),
          apiService.digitalTwinState(),
          apiService.governanceModels()
        ])
        
        let score = 60.0
        let tier = 'ELEVATED'
        if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
          score = riskRes.value.data.risk_score ?? 60.0
          tier = riskRes.value.data.risk_tier || riskRes.value.data.risk_level || 'ELEVATED'
        }

        let nodes = 10
        if (twinRes.status === 'fulfilled' && twinRes.value?.data) {
          const raw = twinRes.value.data
          nodes = (raw.ground_stations?.length || 6) + (raw.infrastructure_nodes?.length || 4)
        }

        let champion = 'Gradient Boosted Trees (GBT)'
        if (govRes.status === 'fulfilled' && govRes.value?.data) {
          champion = govRes.value.data.active_champion_model || champion
        }

        setTelemetry({
          riskScore: score,
          riskTier: tier,
          championModel: champion,
          twinNodesCount: nodes,
          syncTime: new Date().toISOString().slice(11, 19) + ' UTC',
          sparkVcores: '64 / 96 Active',
          hdfsUsed: '42.6 / 120 TB'
        })
      } catch (err) {
        console.error('Failed to update unified telemetry feed:', err)
      }
    }

    fetchTelemetry()
    const timer = setInterval(fetchTelemetry, 30000)
    return () => clearInterval(timer)
  }, [])

  const handleTabChange = (tabId: TabType) => {
    setActiveTabState(tabId)
    setSearchParams({ tab: tabId })
  }

  const activeTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100vh',
      background: '#07080D',
      color: '#FFFFFF',
      fontFamily: "var(--font-sans, 'Plus Jakarta Sans', -apple-system, sans-serif)",
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Dynamic Aurora & Grid Accent Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 12% 18%, ${activeTabConfig.color}15 0%, transparent 45%),
          radial-gradient(circle at 88% 28%, rgba(255, 94, 30, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 50% 85%, rgba(99, 102, 241, 0.06) 0%, transparent 55%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'background-image 0.5s ease-in-out'
      }} />

      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.8,
      }} />

      {/* Top Command Strip & Live Telemetry Ticker */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(7, 8, 13, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Upper Brand & Telemetry Bar */}
        <div style={{
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
        }}>
          {/* Platform Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF5E1E 0%, #00E5FF 100%)',
              boxShadow: '0 0 16px rgba(255, 94, 30, 0.35)',
            }}>
              <Sparkles size={18} color="#FFFFFF" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC' }}>
                  ORBITALYTICS 2.0
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: 'rgba(255, 94, 30, 0.15)',
                  border: '1px solid rgba(255, 94, 30, 0.4)',
                  color: '#FF5E1E'
                }}>
                  UNIFIED INTELLIGENCE SUITE
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '1px' }}>
                Predictive • Prescriptive • Autonomous Aerospace Decision Workspace
              </div>
            </div>
          </div>

          {/* Real-Time Telemetry Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Forecast Risk */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <ShieldAlert size={14} color="#FF5E1E" />
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Risk Score:</span>
              <strong style={{ fontSize: '12px', color: '#F8FAFC' }}>{telemetry.riskScore}/100</strong>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#FF5E1E',
                background: 'rgba(255, 94, 30, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {telemetry.riskTier}
              </span>
            </div>

            {/* Champion Forecaster */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <Award size={14} color="#10B981" />
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Champion:</span>
              <strong style={{ fontSize: '12px', color: '#34D399' }}>{telemetry.championModel}</strong>
            </div>

            {/* Topology Twin */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <Activity size={14} color="#00E5FF" />
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Active Nodes:</span>
              <strong style={{ fontSize: '12px', color: '#00E5FF' }}>{telemetry.twinNodesCount} Synced</strong>
            </div>

            {/* Spark & YARN Pulse */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '11px',
              color: '#34D399'
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 8px #10B981'
              }} />
              <span>{telemetry.syncTime}</span>
            </div>
          </div>
        </div>

        {/* 6-Engine Interactive Command Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 24px 0 24px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 18px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${tab.color}` : '3px solid transparent',
                  background: isActive ? 'rgba(30, 41, 59, 0.7)' : 'transparent',
                  color: isActive ? '#F8FAFC' : '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: isActive ? `${tab.color}25` : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${isActive ? `${tab.color}50` : 'rgba(255, 255, 255, 0.08)'}`,
                  transition: 'all 0.2s ease'
                }}>
                  <Icon size={16} color={isActive ? tab.color : '#94A3B8'} />
                </div>

                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: '-0.01em',
                    color: isActive ? '#F8FAFC' : '#CBD5E1'
                  }}>
                    {tab.label}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: isActive ? tab.color : '#64748B',
                    textTransform: 'uppercase'
                  }}>
                    {tab.tag}
                  </div>
                </div>

                {isActive && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: tab.color,
                    boxShadow: `0 0 8px ${tab.color}`,
                    marginLeft: 4,
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Active Tab View Container */}
      <main style={{
        flex: 1,
        position: 'relative',
        zIndex: 10,
        animation: 'fadeIn 0.25s ease-in-out'
      }}>
        {activeTab === 'decision' && <DecisionHub />}
        {activeTab === 'optimization' && <OptimizationLab />}
        {activeTab === 'stress' && <StressTestingLab />}
        {activeTab === 'analyst' && <AIAnalyst />}
        {activeTab === 'twin' && <DigitalTwin />}
        {activeTab === 'governance' && <ModelGovernance />}
      </main>
    </div>
  )
}

export default Orbitalytics2Unified
