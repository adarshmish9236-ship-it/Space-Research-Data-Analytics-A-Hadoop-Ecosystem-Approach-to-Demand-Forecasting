import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { apiService } from '../services/api'

interface CleansingStage {
  stage: string
  name: string
  description: string
  record_count: number
  drop_count: number
  retention_pct: number
  status: string
}

export default function DataQuality() {
  const [selectedDataset, setSelectedDataset] = useState('missions')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const DATASETS = [
    { id: 'missions', label: 'Flight Missions' },
    { id: 'satellites', label: 'Satellites Catalog' },
    { id: 'launches', label: 'Launch Events' },
    { id: 'resources', label: 'Resource Allocations' },
    { id: 'telemetry', label: 'Orbital Telemetry' },
  ]

  const loadData = () => {
    setLoading(true)
    apiService.dataQuality(selectedDataset)
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Data quality fetch failed:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [selectedDataset])

  const funnel: CleansingStage[] = data?.cleansing_funnel || []

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 8px', borderRadius: 4,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 600,
            }}>
              Spark Lakehouse Integrity
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              Data Quality Center • Multi-Stage Cleansing Pipeline • Schema Enforcement
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem', fontWeight: 700,
            letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0,
          }}>
            Data Quality & Integrity Center
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: 820, lineHeight: 1.5 }}>
            Automated distributed verification of data hygiene across the partitioned Parquet lakehouse. Inspect null imputation rates, deduplication efficiency, IQR outlier filtration, and completeness ratios.
          </p>
        </div>

        {/* Dataset Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface)', padding: 4, borderRadius: 6, border: '1px solid var(--color-border)' }}>
          {DATASETS.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDataset(d.id)}
              style={{
                padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s ease',
                background: selectedDataset === d.id ? 'var(--color-accent)' : 'transparent',
                color: selectedDataset === d.id ? '#FFFFFF' : 'var(--color-text-secondary)',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: 100, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 350, borderRadius: 8 }} />
        </div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.25rem', marginBottom: '1.75rem',
          }}>
            {/* KPI 1: Completeness */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="stat-label">DATA COMPLETENESS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-success)', margin: '0.4rem 0' }}>
                {data?.completeness_percentage}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Grade: <strong style={{ color: 'var(--color-text-primary)' }}>{data?.quality_grade}</strong> • Null rate {data?.null_percentage}%
              </div>
            </div>

            {/* KPI 2: Total Valid Records */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="stat-label">VALIDATED LAKE RECORDS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent)', margin: '0.4rem 0' }}>
                {data?.valid_records?.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Of {data?.total_records?.toLocaleString()} processed rows
              </div>
            </div>

            {/* KPI 3: Deduplicated */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="stat-label">DUPLICATES PURGED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.4rem 0' }}>
                {data?.duplicate_records?.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Dropped via partition window functions
              </div>
            </div>

            {/* KPI 4: Outliers & Invalids */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="stat-label">OUTLIERS & ANOMALIES</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: data?.outliers_count > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)', margin: '0.4rem 0' }}>
                {data?.outliers_count?.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Clamped / trimmed to physical boundaries
              </div>
            </div>
          </div>

          {/* Cleansing Funnel Diagram */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '1.75rem',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  End-to-End Data Cleansing & Validation Funnel
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 3 }}>
                  Multi-pass data cleansing pipeline: Raw Data → Validation → Deduplication → Null Handling → Outlier Detection → Clean Dataset
                </div>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                Query Latency: {data?.query_time_ms} ms
              </span>
            </div>

            {/* Visual Funnel Blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {funnel.map((fn, idx) => {
                const maxRecords = funnel[0]?.record_count || 1
                const widthPct = Math.max(15, (fn.record_count / maxRecords) * 100)

                return (
                  <div key={fn.stage} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                          fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fn.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>• {fn.description}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {fn.drop_count > 0 && (
                          <span style={{ color: 'var(--color-warning)' }}>
                            -{fn.drop_count.toLocaleString()} dropped
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {fn.record_count.toLocaleString()} rows
                        </span>
                        <span style={{ color: 'var(--color-accent)' }}>
                          ({fn.retention_pct}%)
                        </span>
                      </div>
                    </div>

                    {/* Funnel Progress Track */}
                    <div style={{
                      width: '100%', height: 12, borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.05)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${widthPct}%`, height: '100%',
                        borderRadius: 3,
                        background: idx === funnel.length - 1
                          ? 'linear-gradient(90deg, #10B981, #00C8E8)'
                          : 'linear-gradient(90deg, var(--color-accent), #6366F1)',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>

                    {idx < funnel.length - 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                        <ArrowDown size={12} color="var(--color-border-dim)" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Details Row: Null Breakdown & Outlier Treatment Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
            
            {/* Column Null & Sparsity Audit */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                Column Null & Sparsity Audit
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data?.null_breakdown?.map((col: any) => (
                  <div key={col.column} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 4,
                    border: '1px solid var(--color-border-dim)', fontSize: '0.78rem',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {col.column}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: col.missing_count > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {col.missing_count} nulls
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                        ({col.pct}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outlier Detection Rules & Physical Constraints */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                Aerospace Boundary Rules & Filter Policy
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data?.outlier_breakdown?.map((item: any, i: number) => (
                  <div key={i} style={{
                    padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 4,
                    border: '1px solid var(--color-border-dim)', fontSize: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--color-accent)' }}>{item.field}</strong>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        {item.count} Detected
                      </span>
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                      Constraint: <code style={{ color: 'var(--color-text-primary)' }}>{item.condition}</code>
                    </div>
                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem' }}>
                      Resolution: {item.action}
                    </div>
                  </div>
                ))}

                <div style={{
                  padding: '10px 12px', background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 4, fontSize: '0.72rem',
                  color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '0.5rem',
                }}>
                  <strong style={{ color: 'var(--color-success)' }}>Deterministic Pipeline:</strong> All cleaning filters and boundary checks execute in PySpark prior to Parquet serialization, guaranteeing 100% reproducible training datasets with zero leakage.
                </div>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  )
}
