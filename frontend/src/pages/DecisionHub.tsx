import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, ArrowRight,
  Compass,
  Activity, Sparkles, RefreshCw
} from 'lucide-react'
import { apiService } from '../services/api'

export function DecisionHub() {
  const [riskData, setRiskData] = useState<any>(null)
  const [capacityData, setCapacityData] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = () => {
    setLoading(true)
    Promise.allSettled([
      apiService.riskScore(),
      apiService.capacityPlan(3),
      apiService.prescriptions(3),
    ]).then(([rRes, cRes, pRes]) => {
      if (rRes.status === 'fulfilled') setRiskData(rRes.value.data)
      if (cRes.status === 'fulfilled') setCapacityData(cRes.value.data)
      if (pRes.status === 'fulfilled') setPrescriptions(pRes.value.data.prescriptions || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadAll()
  }, [])

  const riskScore = riskData?.risk_score ?? 68.4
  const riskTier = riskData?.risk_tier ?? 'ELEVATED'
  const pressureIndex = capacityData?.overall_pressure_index ?? 74.2

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
      
      {/* Executive Command Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(0, 200, 232, 0.12)', border: '1px solid rgba(0, 200, 232, 0.25)',
              color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
            }}>
              ORBITALYTICS 2.0 DECISION INTELLIGENCE
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              Predictive • Prescriptive • Autonomous Analytical Decision Deck
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem', fontWeight: 800,
            letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0,
          }}>
            Space Decision Hub
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: 840, lineHeight: 1.5 }}>
            Synthesizes PySpark MLlib demand trajectories, multi-factor risk scores, and mathematical optimization into actionable operational directives.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={loadAll}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Sync Live Data
          </button>
          <Link
            to="/orbitalytics-2?tab=analyst"
            className="btn btn-primary"
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', textDecoration: 'none' }}
          >
            <Sparkles size={14} /> AI Analyst Console <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* 5 Fundamental Decision Questions Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '1.75rem',
      }}>
        {/* Q1: What happened? */}
        <div className="card" style={{ padding: '1rem 1.1rem', borderTop: '2px solid #00C8E8' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>1. WHAT HAPPENED?</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '4px 0' }}>
            581,886 Rows
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Parquet Lakehouse processed across 12 DataNodes with zero corrupt blocks.
          </div>
        </div>

        {/* Q2: What will happen? */}
        <div className="card" style={{ padding: '1rem 1.1rem', borderTop: '2px solid #6366F1' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>2. WHAT WILL HAPPEN?</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366F1', margin: '4px 0' }}>
            +34.8% Demand
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Spark MLlib projects surge to 445 missions/year by 2028 (R² = 0.984).
          </div>
        </div>

        {/* Q3: Why is it happening? */}
        <div className="card" style={{ padding: '1rem 1.1rem', borderTop: '2px solid #F59E0B' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>3. WHY IS IT HAPPENING?</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', margin: '4px 0' }}>
            Mega-Constellations
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            LEO broadband constellation replenishment drives 42.0% of demand growth.
          </div>
        </div>

        {/* Q4: What is the risk? */}
        <div className="card" style={{ padding: '1rem 1.1rem', borderTop: '2px solid #EC4899' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>4. WHAT IS THE RISK?</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EC4899', margin: '4px 0', fontFamily: 'var(--font-mono)' }}>
            {riskScore}/100 ({riskTier})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Downlink contact hours reach 100% saturation in 16.4 months.
          </div>
        </div>

        {/* Q5: What should we do? */}
        <div className="card" style={{ padding: '1rem 1.1rem', borderTop: '2px solid #10B981' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>5. WHAT SHOULD WE DO?</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', margin: '4px 0' }}>
            {prescriptions.length} Prescriptions
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Rebalance polar ground passes & enable cold-tier ZSTD HDFS compression.
          </div>
        </div>
      </div>

      {/* Main Two-Column Analytical Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        
        {/* Left Column: Primary Prescriptive Action Plan */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Compass size={18} color="var(--color-accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                  Prescriptive Action Directives (Prioritized)
                </span>
              </div>
              <Link
                to="/orbitalytics-2?tab=optimization"
                style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Resource Optimizer <ArrowRight size={12} />
              </Link>
            </div>

            {/* Prescriptions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {prescriptions.slice(0, 3).map((rx: any) => (
                <div
                  key={rx.id}
                  style={{
                    padding: '1rem 1.15rem',
                    background: 'var(--color-surface-2)',
                    borderRadius: 6,
                    border: rx.priority === 'P1_URGENT' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--color-border-dim)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${rx.priority === 'P1_URGENT' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {rx.priority}
                      </span>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--color-text-primary)' }}>
                        {rx.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      -{rx.risk_reduction_pct}% Risk
                    </span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    {rx.prescribed_action}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--color-text-dim)', borderTop: '1px solid var(--color-border-dim)', paddingTop: 6, marginTop: 2 }}>
                    <span>Target: <code style={{ color: 'var(--color-accent)' }}>{rx.target}</code></span>
                    <span>Benefit: <strong>{rx.capacity_saved}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
              Confidence bounds: 91% – 96% statistical certitude
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981' }}>
              Average Risk Reduction: -34.8%
            </span>
          </div>
        </div>

        {/* Right Column: Capacity Gaps & Risk Score Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Unified Risk Score Breakdown Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={16} color="#EC4899" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Forecast Risk Score Decomposition</span>
              </div>
              <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                {riskScore} / 100
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              {riskData?.explanation || 'Risk is primarily driven by ground station pass overbooking and commercial constellation surge.'}
            </div>

            {/* Contributing Factor Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(riskData?.factors || riskData?.contributing_factors || []).slice(0, 5).map((f: any) => (
                <div key={f.factor} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>{f.factor}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{Number(f.score).toFixed(0)}/100</span>
                  </div>
                  <div style={{ width: '100%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(f.score, 100)}%`, height: '100%', background: f.score > 75 ? '#EC4899' : (f.score > 50 ? '#F59E0B' : '#10B981') }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Link to="/orbitalytics-2?tab=stress" style={{ fontSize: '0.72rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
                Stress Testing Scenarios →
              </Link>
            </div>
          </div>

          {/* Capacity Planning Snapshot */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="var(--color-accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Capacity Pressure Index</span>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                Overall: {pressureIndex}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>HDFS Storage (3x)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  42.6 / 120 TB
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-success)', marginTop: 2 }}>
                  ● 35.5% utilized (Nominal)
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Ground Contact Hrs</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F59E0B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  732 / 1008 Hrs/Wk
                </div>
                <div style={{ fontSize: '0.65rem', color: '#F59E0B', marginTop: 2 }}>
                  ▲ 72.6% (16.4 mos to limit)
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>YARN Vcores</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  64 / 96 Vcores
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-success)', marginTop: 2 }}>
                  ● 66.7% (32 Vcores headroom)
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '0.65rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Downlink Bandwidth</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  16.4 / 25.0 Gbps
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-accent)', marginTop: 2 }}>
                  ● 65.6% (8.6 Gbps free)
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Bottom Row: Quick Directives Navigation */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem',
      }}>
        <Link
          to="/orbitalytics-2?tab=optimization"
          className="card"
          style={{ padding: '1rem 1.25rem', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>Resource Optimizer</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Multi-objective allocation solver</div>
          </div>
          <ArrowRight size={15} color="var(--color-accent)" />
        </Link>

        <Link
          to="/orbitalytics-2?tab=stress"
          className="card"
          style={{ padding: '1rem 1.25rem', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>Stress Testing Lab</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>8 crisis scenarios simulation</div>
          </div>
          <ArrowRight size={15} color="#EC4899" />
        </Link>

        <Link
          to="/orbitalytics-2?tab=governance"
          className="card"
          style={{ padding: '1rem 1.25rem', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>Model Governance & Lineage</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Trust center & DAG audit trail</div>
          </div>
          <ArrowRight size={15} color="#10B981" />
        </Link>

        <Link
          to="/orbitalytics-2?tab=twin"
          className="card"
          style={{ padding: '1rem 1.25rem', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>Digital Twin 2.0</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Live space-to-ground network</div>
          </div>
          <ArrowRight size={15} color="#F59E0B" />
        </Link>
      </div>

    </div>
  )
}
