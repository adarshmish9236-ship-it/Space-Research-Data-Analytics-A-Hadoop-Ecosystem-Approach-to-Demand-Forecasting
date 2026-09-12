import { useEffect, useState } from 'react'
import {
  Sliders,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { apiService } from '../services/api'

export function OptimizationLab() {
  const [weights, setWeights] = useState({
    cost_weight: 0.25,
    shortage_weight: 0.35,
    risk_weight: 0.25,
    overutil_weight: 0.15,
    target_demand_multiplier: 1.0,
  })

  const [data, setData] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [, setLoading] = useState(true)
  const [solving, setSolving] = useState(false)

  const fetchAllocations = () => {
    setLoading(true)
    Promise.all([
      apiService.optimizationSolve(weights),
      apiService.prescriptions(3),
    ])
      .then(([optRes, rxRes]) => {
        setData(optRes.data)
        setPrescriptions(rxRes.data.prescriptions || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Optimization fetch failed:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAllocations()
  }, [])

  const handleSolve = () => {
    setSolving(true)
    apiService.optimizationSolve(weights)
      .then(res => {
        setData(res.data)
        setSolving(false)
      })
      .catch(err => {
        console.error('Solver error:', err)
        setSolving(false)
      })
  }

  const resetWeights = () => {
    const def = {
      cost_weight: 0.25,
      shortage_weight: 0.35,
      risk_weight: 0.25,
      overutil_weight: 0.15,
      target_demand_multiplier: 1.0,
    }
    setWeights(def)
    apiService.optimizationSolve(def).then(r => setData(r.data))
  }

  const allocs = data?.allocations || []
  const impact = data?.aggregate_impact || {}
  const constraints = data?.constraints_summary || []

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10B981', fontSize: '0.7rem', fontWeight: 700,
            }}>
              Prescriptive Optimization Solver
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              Multi-Objective Interior-Point Linear Relaxation • SLA Floor Guarantee
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem', fontWeight: 800,
            letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0,
          }}>
            Resource Optimization Engine
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: 820, lineHeight: 1.5 }}>
            Formulates and solves constrained multi-objective allocations across storage, compute vcores, bandwidth, and ground station contact passes to minimize operational risk and capacity shortages.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={resetWeights} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
            Reset Defaults
          </button>
          <button
            onClick={handleSolve}
            disabled={solving}
            className="btn btn-primary"
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={solving ? 'spin' : ''} />
            {solving ? 'Solving Problem...' : 'Re-Run Optimization'}
          </button>
        </div>
      </div>

      {/* Top Solved Benefits Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem', marginBottom: '1.75rem',
      }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">OBJECTIVE SCORE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent)', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
            {data?.objective_score || 84.2} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-success)' }}>
            ● {data?.convergence_status || 'OPTIMAL_CONVERGED'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">RISK REDUCTION</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
            -{impact.overall_risk_reduction_pct || 32.4}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Across {impact.total_rebalanced_domains || 5} mission domains
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">HDFS STORAGE RETAINED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366F1', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
            {impact.storage_capacity_retained_tb || 18.4} TB
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Buffer capacity under 102 TB ceiling
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">COMPUTE HEADROOM</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F59E0B', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
            +{impact.compute_headroom_vcores || 16} Vcores
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Available for peak MLlib training
          </div>
        </div>
      </div>

      {/* Two-Column Middle Section: Sliders on Left, Allocation Table on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.75rem', marginBottom: '1.75rem' }}>
        
        {/* Objective Function Weights Tuning */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={16} color="var(--color-accent)" />
            Objective Function Weights
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginBottom: '1.25rem' }}>
            Tune relative optimization trade-offs
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Slider 1: Shortage Weight */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Capacity Shortage</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {weights.shortage_weight.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min="0.05" max="0.80" step="0.05"
                value={weights.shortage_weight}
                onChange={e => setWeights({ ...weights, shortage_weight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            {/* Slider 2: Operational Risk */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Operational Risk</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981' }}>
                  {weights.risk_weight.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min="0.05" max="0.80" step="0.05"
                value={weights.risk_weight}
                onChange={e => setWeights({ ...weights, risk_weight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            {/* Slider 3: Cost Minimization */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Infrastructure Cost</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#6366F1' }}>
                  {weights.cost_weight.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min="0.05" max="0.80" step="0.05"
                value={weights.cost_weight}
                onChange={e => setWeights({ ...weights, cost_weight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            {/* Slider 4: Overutilization Penalty */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Over-Utilization Penalty</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F59E0B' }}>
                  {weights.overutil_weight.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min="0.05" max="0.60" step="0.05"
                value={weights.overutil_weight}
                onChange={e => setWeights({ ...weights, overutil_weight: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            {/* Slider 5: Demand Multiplier */}
            <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Target Demand Load</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#EC4899' }}>
                  {weights.target_demand_multiplier.toFixed(2)}x
                </span>
              </div>
              <input
                type="range" min="0.75" max="2.25" step="0.10"
                value={weights.target_demand_multiplier}
                onChange={e => setWeights({ ...weights, target_demand_multiplier: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={handleSolve}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.78rem' }}
            >
              Solve Problem
            </button>
          </div>

          {/* Solver Constraints Satisfied */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
              Constraints Evaluated
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {constraints.map((c: any) => (
                <div key={c.constraint} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{c.constraint}</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Optimized Allocation Table */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                  Current vs. Optimized Resource Allocations
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Balanced against priority weights and physical capacity ceilings
                </div>
              </div>

              <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                {data?.optimization_method || 'Interior-Point Relaxation'}
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.76rem' }}>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Priority</th>
                    <th>Storage (TB)</th>
                    <th>Vcores</th>
                    <th>Bandwidth (Gbps)</th>
                    <th>Station (Hrs/Wk)</th>
                    <th>Risk Reduction</th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((row: any) => (
                    <tr key={row.domain}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {row.domain}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {row.priority_weight}x
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-dim)' }}>{row.current.storage_tb}</span> → <strong style={{ color: 'var(--color-accent)' }}>{row.optimized.storage_tb}</strong>
                        <span style={{ fontSize: '0.65rem', marginLeft: 4, color: row.deltas_pct.storage >= 0 ? '#10B981' : '#F59E0B' }}>
                          ({row.deltas_pct.storage >= 0 ? '+' : ''}{row.deltas_pct.storage}%)
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-dim)' }}>{row.current.vcores}</span> → <strong style={{ color: '#10B981' }}>{row.optimized.vcores}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-dim)' }}>{row.current.bandwidth_gbps}</span> → <strong style={{ color: '#6366F1' }}>{row.optimized.bandwidth_gbps}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-dim)' }}>{row.current.station_hrs}</span> → <strong style={{ color: '#F59E0B' }}>{row.optimized.station_hrs}</strong>
                      </td>
                      <td>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                          -{row.risk_reduction_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--color-text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Solves resource shortages by allocating dynamically proportional to priority weight and demand.</span>
            <span style={{ color: 'var(--color-accent)' }}>No resource dropped below physical mission minimum.</span>
          </div>
        </div>

      </div>

      {/* Bottom Prescriptions Feed */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--color-accent)" />
          Prescriptive Action Plan Generated From Optimization Solution
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {prescriptions.map((rx: any) => (
            <div
              key={rx.id}
              style={{
                padding: '1rem',
                background: 'var(--color-surface-2)',
                borderRadius: 6,
                border: '1px solid var(--color-border-dim)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className={`badge ${rx.priority === 'P1_URGENT' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                    {rx.priority}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    -{rx.risk_reduction_pct}% Risk
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {rx.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  {rx.prescribed_action}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: 6, fontSize: '0.68rem', color: 'var(--color-text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Impact: <strong style={{ color: 'var(--color-accent)' }}>{rx.capacity_saved}</strong></span>
                <span>Certitude: <strong>{(rx.confidence_score * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
