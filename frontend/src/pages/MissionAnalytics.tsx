/**
 * ORBITALYTICS — Analytics Studio
 * Enterprise Aerospace Analytics Engine powered by Apache Spark Parquet Data Lake
 */
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, Legend, Area, ReferenceLine
} from 'recharts'
import { apiService } from '../services/api'
import { motion } from 'framer-motion'

type ActiveTab = 'cadence' | 'vehicles' | 'cost_payload' | 'geopolitical' | 'agencies'

// Aerospace Custom Tooltip for Flight Cadence & Reliability
function CadenceCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div
      style={{
        background: 'rgba(10, 16, 29, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 200, 232, 0.35)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 200, 232, 0.15)',
        fontSize: '0.75rem',
        minWidth: 210,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
          ERA YEAR {label}
        </span>
        {d.yoy_growth_pct !== undefined && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              background: d.yoy_growth_pct >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: d.yoy_growth_pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            {d.yoy_growth_pct >= 0 ? `+${d.yoy_growth_pct}% YoY` : `${d.yoy_growth_pct}% YoY`}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Flight Cadence:</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{d.total_missions?.toLocaleString()} flights</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Success Rate:</span>
          <span style={{ color: d.success_rate_pct >= 90 ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 700 }}>
            {d.success_rate_pct}%
          </span>
        </div>
        {d.total_cost_musd !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Est. Budget:</span>
            <span style={{ color: 'var(--color-warning)' }}>${d.total_cost_musd?.toLocaleString()} M</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Aerospace Custom Tooltip for Payload Mass Delivered
function PayloadCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div
      style={{
        background: 'rgba(10, 16, 29, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15)',
        fontSize: '0.75rem',
        minWidth: 210,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
          ERA YEAR {label}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
          PAYLOAD TONNAGE
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Delivered Mass:</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{d.total_payload_tons?.toLocaleString()} Metric Tons</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Cumulative Mass:</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{d.cumulative_payload_tons?.toLocaleString()} T</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Avg Booster Payload:</span>
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>{d.avg_payload_kg?.toLocaleString()} kg</span>
        </div>
      </div>
    </div>
  )
}

export default function MissionAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('cadence')

  const [selectedOrbit, setSelectedOrbit] = useState('ALL')
  const [selectedCountry, setSelectedCountry] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')
  const [yearPreset, setYearPreset] = useState<'all' | 'modern' | 'commercial'>('all')

  // Agency Analytics state
  const [agencyData, setAgencyData] = useState<any[]>([])

  // Tab 1 View Modes
  const [cadenceViewMode, setCadenceViewMode] = useState<'both' | 'missions' | 'reliability'>('both')
  const [payloadViewMode, setPayloadViewMode] = useState<'annual' | 'cumulative'>('annual')

  useEffect(() => {
    apiService.agencyAnalytics()
      .then(res => setAgencyData(res.data.agencies || []))
      .catch(err => console.error('Agency fetch error:', err))
  }, [])

  const fetchAnalytics = () => {
    setLoading(true)
    const params: any = {
      orbit: selectedOrbit,
      country: selectedCountry,
      mission_type: selectedType,
    }
    if (yearPreset === 'modern') {
      params.year_from = 2000
    } else if (yearPreset === 'commercial') {
      params.year_from = 2012
    }

    apiService.analyticsStudio(params)
      .then(r => {
        setData(r.data)
        setLoading(false)
      })
      .catch(e => {
        console.error('Analytics studio error:', e)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedOrbit, selectedCountry, selectedType, yearPreset])

  const handleResetFilters = () => {
    setSelectedOrbit('ALL')
    setSelectedCountry('ALL')
    setSelectedType('ALL')
    setYearPreset('all')
  }

  const exportAnalyticsJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orbitalytics_analytics_${selectedOrbit}_${selectedCountry}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const metrics = data?.metrics || {}
  const yearly = data?.yearly_trends || []
  const costAnalysis = data?.cost_analysis || []
  const vehicles = data?.vehicle_leaderboard || []
  const countries = data?.country_distribution || []
  const orbits = data?.orbit_distribution || []
  const filters = data?.available_filters || {}

  // Enriched yearly trends with cumulative payload mass calculation
  const enrichedYearly = (yearly || []).map((y: any, idx: number, arr: any[]) => {
    let cumulative = 0
    for (let i = 0; i <= idx; i++) {
      cumulative += (arr[i]?.total_payload_tons || 0)
    }
    return {
      ...y,
      cumulative_payload_tons: Math.round(cumulative * 10) / 10,
    }
  })

  const peakFlightYear = enrichedYearly.reduce((max: any, cur: any) =>
    (cur.total_missions > (max?.total_missions || 0) ? cur : max), null
  )

  const avgReliabilityRate = enrichedYearly.length
    ? (enrichedYearly.reduce((acc: number, c: any) => acc + (c.success_rate_pct || 0), 0) / enrichedYearly.length).toFixed(1)
    : '0.0'

  const peakTonnageYear = enrichedYearly.reduce((max: any, cur: any) =>
    (cur.total_payload_tons > (max?.total_payload_tons || 0) ? cur : max), null
  )

  const cumulativeTonnageTotal = enrichedYearly.length
    ? enrichedYearly[enrichedYearly.length - 1].cumulative_payload_tons
    : 0

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', padding: '2rem', background: 'var(--color-bg)' }}>
      {/* Clean Enterprise Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Mission Analytics Studio
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            marginTop: 4,
            maxWidth: 720,
            lineHeight: 1.5,
          }}>
            Historical flight telemetry, launch vehicle reliability records, and orbital payload analytics aggregated across global space programs.
          </p>
        </div>

        <div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={exportAnalyticsJson}
            disabled={loading || !data}
            style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: 4 }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Clean Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Filters:
            </span>

            {/* Orbit Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Orbit:</span>
              <select
                className="select select-sm"
                value={selectedOrbit}
                onChange={e => setSelectedOrbit(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 4 }}
              >
                <option value="ALL">All Orbits ({orbits.reduce((acc: number, o: any) => acc + o.mission_count, 0).toLocaleString()})</option>
                {filters.orbits?.map((o: string) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Country:</span>
              <select
                className="select select-sm"
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 4 }}
              >
                <option value="ALL">All Spacefaring Nations</option>
                {filters.countries?.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Mission Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Type:</span>
              <select
                className="select select-sm"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 4 }}
              >
                <option value="ALL">All Mission Types</option>
                {filters.mission_types?.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Year Range Presets */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Era:</span>
              <button
                className={`btn btn-xs ${yearPreset === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setYearPreset('all')}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4 }}
              >
                All (1957–2024)
              </button>
              <button
                className={`btn btn-xs ${yearPreset === 'modern' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setYearPreset('modern')}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4 }}
              >
                2000–2024
              </button>
              <button
                className={`btn btn-xs ${yearPreset === 'commercial' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setYearPreset('commercial')}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4 }}
              >
                Commercial (2012+)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Filtered: <strong style={{ color: 'var(--color-text-primary)' }}>{metrics.total_missions?.toLocaleString() || 0}</strong> flights
            </span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={handleResetFilters}
              style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Clean KPI Highlights Grid */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Filtered Missions</div>
          <div className="kpi-value" style={{ color: 'var(--color-accent)' }}>
            {metrics.total_missions ? metrics.total_missions.toLocaleString() : '0'}
          </div>
          <div className="kpi-subtext">Active filter population</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Mission Reliability</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>
            {metrics.success_rate ? `${(metrics.success_rate * 100).toFixed(1)}%` : '0.0%'}
          </div>
          <div className="kpi-subtext">Historical launch success rate</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Delivered Payload</div>
          <div className="kpi-value" style={{ color: 'var(--color-info)' }}>
            {metrics.total_payload_metric_tons ? metrics.total_payload_metric_tons.toLocaleString() : '0'}{' '}
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Tons</span>
          </div>
          <div className="kpi-subtext">Avg {(metrics.avg_payload_kg || 0).toLocaleString()} kg / launch</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Cumulative Budget</div>
          <div className="kpi-value" style={{ color: 'var(--color-warning)' }}>
            ${metrics.total_cost_billion_usd ? metrics.total_cost_billion_usd.toFixed(1) : '0.0'}{' '}
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>B</span>
          </div>
          <div className="kpi-subtext">Avg ${((metrics.cost_per_kg_avg || 0)).toLocaleString()} / kg</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
        <button
          className={`btn btn-sm ${activeTab === 'cadence' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cadence')}
          style={{ fontSize: '0.75rem', borderRadius: 4 }}
        >
          Flight Cadence & Reliability
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'vehicles' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('vehicles')}
          style={{ fontSize: '0.75rem', borderRadius: 4 }}
        >
          Launch Vehicle Fleet Leaderboard
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'cost_payload' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cost_payload')}
          style={{ fontSize: '0.75rem', borderRadius: 4 }}
        >
          Cost vs. Payload Economics
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'geopolitical' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('geopolitical')}
          style={{ fontSize: '0.75rem', borderRadius: 4 }}
        >
          Geopolitical & Orbit Demographics
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'agencies' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('agencies')}
          style={{ fontSize: '0.75rem', borderRadius: 4, background: activeTab === 'agencies' ? 'var(--color-accent)' : undefined, color: activeTab === 'agencies' ? '#FFFFFF' : undefined }}
        >
          Space Agency Analytics (NASA, ESA, ISRO, CNSA, JAXA, Roscosmos)
        </button>
      </div>

      {/* Tab 1: Cadence & Reliability */}
      {activeTab === 'cadence' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {/* Synchronized 2-Column Responsive Grid with Equal Width & Baseline */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Chart 1: Annual Missions & Launch Reliability Over Time */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Synchronized Card Header */}
                <div
                  className="card-header"
                  style={{
                    padding: 0,
                    marginBottom: '1rem',
                    minHeight: 72,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                        Annual Missions & Launch Reliability Over Time
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Dual-Axis: Ingested flight count (bars) vs Orbital insertion reliability % (line)
                    </div>

                    {/* Quick Metric Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(0, 200, 232, 0.1)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(0, 200, 232, 0.2)' }}>
                        Peak: {peakFlightYear ? `${peakFlightYear.year} (${peakFlightYear.total_missions} flights)` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        Avg Reliability: {avgReliabilityRate}%
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className="badge badge-accent">HISTORICAL TIMELINE</span>
                    {/* View mode toggle */}
                    <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 2, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        onClick={() => setCadenceViewMode('both')}
                        style={{
                          background: cadenceViewMode === 'both' ? 'var(--color-accent)' : 'transparent',
                          color: cadenceViewMode === 'both' ? '#000' : 'var(--color-text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setCadenceViewMode('missions')}
                        style={{
                          background: cadenceViewMode === 'missions' ? 'var(--color-accent)' : 'transparent',
                          color: cadenceViewMode === 'missions' ? '#000' : 'var(--color-text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Cadence
                      </button>
                      <button
                        type="button"
                        onClick={() => setCadenceViewMode('reliability')}
                        style={{
                          background: cadenceViewMode === 'reliability' ? 'var(--color-accent)' : 'transparent',
                          color: cadenceViewMode === 'reliability' ? '#000' : 'var(--color-text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Reliability
                      </button>
                    </div>
                  </div>
                </div>

                {/* Symmetrical Dual-Axis Chart Canvas */}
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={enrichedYearly} margin={{ top: 16, right: 20, left: 10, bottom: 4 }}>
                    <defs>
                      <linearGradient id="missionBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00C8E8" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#007A99" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dim)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      width={52}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[50, 100]}
                      width={52}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      unit="%"
                      axisLine={{ stroke: 'var(--color-border)' }}
                    />
                    <Tooltip content={<CadenceCustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
                    <ReferenceLine
                      yAxisId="right"
                      y={90}
                      stroke="rgba(16, 185, 129, 0.45)"
                      strokeDasharray="4 4"
                      label={{ value: '90% Target', fill: 'rgba(16, 185, 129, 0.75)', fontSize: 10, position: 'insideTopRight' }}
                    />
                    {(cadenceViewMode === 'both' || cadenceViewMode === 'missions') && (
                      <Bar
                        yAxisId="left"
                        dataKey="total_missions"
                        name="Total Missions"
                        fill="url(#missionBarGrad)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                    )}
                    {(cadenceViewMode === 'both' || cadenceViewMode === 'reliability') && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="success_rate_pct"
                        name="Success %"
                        stroke="var(--color-success)"
                        strokeWidth={2.6}
                        dot={{ r: 2.5, fill: 'var(--color-success)' }}
                        activeDot={{ r: 5, fill: '#fff', stroke: 'var(--color-success)' }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Analytical Summary Callout */}
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 6,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>
                  <strong>Cadence Velocity:</strong> Global launches accelerated with a modern average success rate of{' '}
                  <strong style={{ color: 'var(--color-success)' }}>{avgReliabilityRate}%</strong> across all spaceports.
                </span>
              </div>
            </div>

            {/* Chart 2: Annual Payload Mass Delivered to Orbit */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Synchronized Card Header */}
                <div
                  className="card-header"
                  style={{
                    padding: 0,
                    marginBottom: '1rem',
                    minHeight: 72,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                        Annual Payload Mass Delivered to Orbit
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Dual-Axis: Delivered tonnage (area) vs Average booster payload mass (line)
                    </div>

                    {/* Quick Metric Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        Peak Year: {peakTonnageYear ? `${peakTonnageYear.year} (${peakTonnageYear.total_payload_tons?.toLocaleString()} T)` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-info)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        Cumulative: {cumulativeTonnageTotal.toLocaleString()} Tons
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className="badge badge-info">PAYLOAD TONNAGE</span>
                    {/* View mode toggle */}
                    <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 2, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        onClick={() => setPayloadViewMode('annual')}
                        style={{
                          background: payloadViewMode === 'annual' ? '#38BDF8' : 'transparent',
                          color: payloadViewMode === 'annual' ? '#000' : 'var(--color-text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Annual Tonnage
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayloadViewMode('cumulative')}
                        style={{
                          background: payloadViewMode === 'cumulative' ? '#38BDF8' : 'transparent',
                          color: payloadViewMode === 'cumulative' ? '#000' : 'var(--color-text-secondary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Cumulative
                      </button>
                    </div>
                  </div>
                </div>

                {/* Symmetrical Dual-Axis Chart Canvas */}
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={enrichedYearly} margin={{ top: 16, right: 20, left: 10, bottom: 4 }}>
                    <defs>
                      <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.65} />
                        <stop offset="50%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dim)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      width={52}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      unit=" T"
                      axisLine={{ stroke: 'var(--color-border)' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      width={52}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      unit=" kg"
                      axisLine={{ stroke: 'var(--color-border)' }}
                    />
                    <Tooltip content={<PayloadCustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={payloadViewMode === 'annual' ? 'total_payload_tons' : 'cumulative_payload_tons'}
                      name={payloadViewMode === 'annual' ? 'Annual Payload (Metric Tons)' : 'Cumulative Mass (Tons)'}
                      stroke="#38BDF8"
                      strokeWidth={2.4}
                      fill="url(#tonnageGrad)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_payload_kg"
                      name="Avg Booster Mass (kg)"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Analytical Summary Callout */}
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 6,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>
                  <strong>Mass Capacity:</strong> Total delivered payload mass reached{' '}
                  <strong style={{ color: 'var(--color-accent)' }}>{cumulativeTonnageTotal.toLocaleString()} Metric Tons</strong> across global launch campaigns.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 2: Launch Vehicle Fleet Leaderboard */}
      {activeTab === 'vehicles' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ padding: 0, marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Launch Vehicle Fleet Performance Matrix</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                  Aggregated launch vehicle flight records, reliability track record, and payload tonnage
                </div>
              </div>
              <span className="badge badge-accent">15 TOP BOOSTERS</span>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>LAUNCH VEHICLE</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>TOTAL FLIGHTS</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>RELIABILITY %</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>AVG PAYLOAD</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>TOTAL TONNAGE</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>COST / KG</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.72rem', textAlign: 'left', color: 'var(--color-text-secondary)' }}>SERVICE ERA</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v: any) => (
                    <tr key={v.vehicle} style={{ borderBottom: '1px solid var(--color-border-dim)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                        {v.vehicle}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {v.launches?.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${v.success_rate_pct >= 88 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                            {v.success_rate_pct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {v.avg_payload_kg?.toLocaleString()} kg
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-info)' }}>
                        {v.total_payload_tons?.toLocaleString()} T
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-warning)' }}>
                        ${v.cost_per_kg_usd?.toLocaleString()}/kg
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {v.era}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Cost vs Payload Economics */}
      {activeTab === 'cost_payload' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ padding: 0, marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Budget Allocation by Mission Classification</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Average budget in Millions USD per flight category</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={costAnalysis} layout="vertical" margin={{ top: 10, right: 15, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dim)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} unit=" $M" />
                  <YAxis type="category" dataKey="mission_type" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Bar dataKey="avg_cost_musd" name="Avg Cost ($M)" fill="var(--color-warning)" radius={[0, 4, 4, 0]} barSize={16} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ padding: 0, marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Average Payload Mass by Mission Classification</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Average mass in kg launched to orbit</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={costAnalysis} layout="vertical" margin={{ top: 10, right: 15, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dim)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} unit=" kg" />
                  <YAxis type="category" dataKey="mission_type" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Bar dataKey="avg_payload_kg" name="Avg Payload (kg)" fill="var(--color-info)" radius={[0, 4, 4, 0]} barSize={16} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 4: Geopolitical & Orbit Demographics */}
      {activeTab === 'geopolitical' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Top Spacefaring Nations */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ padding: 0, marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Global Space Agency Market Share</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>Flight volume and market capture by country</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {countries.map((c: any) => (
                  <div key={c.country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{c.country}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                        {c.mission_count?.toLocaleString()} missions ({c.market_share_pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, c.market_share_pct * 3)}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orbit Breakdown */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ padding: 0, marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Orbital Regime Destinations</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>Mission volume distributed by target orbital altitude</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {orbits.map((o: any) => (
                  <div key={o.orbit} style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-accent)' }}>{o.orbit}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
                        {o.mission_count?.toLocaleString()} flights
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: 4 }}>
                      <span>Global Share: {o.share_pct}%</span>
                      <span>Total Payload: {o.total_payload_tons?.toLocaleString()} T</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 5: Space Agency Analytics (NASA, ESA, ISRO, CNSA, JAXA, Roscosmos) */}
      {activeTab === 'agencies' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          
          {/* Header Banner */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                International Space Agency Analytics & Comparative Demand
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 3 }}>
                Benchmarking NASA, ESA, ISRO, CNSA, JAXA, and Roscosmos across current demand, forecast trajectory, fleet scale, and ground infrastructure.
              </div>
            </div>
            <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
              6 Space Agencies Benchmarked
            </span>
          </div>

          {/* Agency Comparison Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {agencyData.map((ag: any) => (
              <div
                key={ag.agency_key}
                className="card"
                style={{
                  padding: '1.25rem',
                  borderTop: `3px solid ${ag.color}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>{ag.flag}</span>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {ag.agency_key}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                          {ag.country}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>
                      {ag.success_rate_pct}% Reliability
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
                    {ag.agency_name}
                  </div>

                  {/* Demand Numbers */}
                  <div style={{ background: 'var(--color-surface-2)', padding: '10px 12px', borderRadius: 6, marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Current Demand</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{ag.current_demand} missions/yr</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Forecast Demand</span>
                      <strong style={{ fontSize: '0.95rem', color: ag.color }}>{ag.forecast_demand} missions/yr</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Growth Trajectory</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)' }}>+{ag.growth_pct}% YoY</span>
                    </div>
                  </div>
                </div>

                {/* Resource Allocations */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--color-border-dim)' }}>
                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.62rem' }}>STORAGE</div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{ag.resources?.storage_tb} TB</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--color-border-dim)' }}>
                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.62rem' }}>BANDWIDTH</div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{ag.resources?.bandwidth_gbps} Gbps</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--color-border-dim)' }}>
                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.62rem' }}>MISSIONS RECORD</div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{ag.mission_count} Flights</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--color-border-dim)' }}>
                    <div style={{ color: 'var(--color-text-dim)', fontSize: '0.62rem' }}>SATELLITES</div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{ag.satellite_count} Satellites</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparative Chart */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
              Multi-Agency Demand Comparison: Baseline vs Forward Forecast
            </div>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agencyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="agency_key" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                  <Tooltip content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0]?.payload
                    return (
                      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: 4 }}>
                          {p.agency_key} — {p.country}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Current Demand: {p.current_demand} missions/yr</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>Forecast Demand: {p.forecast_demand} missions/yr</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: 2 }}>Projected Growth: +{p.growth_pct}%</div>
                      </div>
                    )
                  }} />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
                  <Bar dataKey="current_demand" name="Current Annual Demand" fill="#64748B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="forecast_demand" name="Projected MLlib Demand" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  )
}

