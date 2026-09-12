import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { apiService } from '../services/api'

interface ParamConfig {
  id: string
  label: string
  min: number
  max: number
  step: number
  default: number
  unit: string
  desc: string
}

const PARAMETERS: ParamConfig[] = [
  { id: 'satellite_growth', label: 'Satellite Fleet Growth', min: -50, max: 150, step: 5, default: 20, unit: '%', desc: 'Mega-constellation deployment and orbital replenishment rate' },
  { id: 'mission_growth', label: 'Mission Growth', min: -40, max: 100, step: 5, default: 15, unit: '%', desc: 'Global orbital research and commercial mission launch demand' },
  { id: 'launch_frequency', label: 'Launch Frequency', min: -30, max: 120, step: 5, default: 15, unit: '%', desc: 'Booster launch cadence from international spaceports' },
  { id: 'ground_station_capacity', label: 'Ground Station Capacity', min: -30, max: 80, step: 5, default: 10, unit: '%', desc: 'Downlink antenna array tracking footprint and availability' },
  { id: 'data_volume', label: 'Telemetry Data Volume', min: -20, max: 150, step: 5, default: 30, unit: '%', desc: 'Payload sensor resolution and science stream bitrates' },
  { id: 'bandwidth_capacity', label: 'Bandwidth Capacity', min: -20, max: 120, step: 5, default: 25, unit: '%', desc: 'Optical and Ka/Ku-band downlink channel transmission capacity' },
]

export default function ScenarioLab() {
  const [params, setParams] = useState<Record<string, number>>({
    satellite_growth: 20,
    mission_growth: 15,
    launch_frequency: 15,
    ground_station_capacity: 10,
    data_volume: 30,
    bandwidth_capacity: 25,
  })

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'trajectories' | 'monte_carlo'>('trajectories')
  const debounceTimerRef = useRef<any>(null)

  const executeSimulation = useCallback((currentParams: Record<string, number>) => {
    setLoading(true)
    // Convert percentage values to multiplier for backend
    const apiPayload = {
      satellite_growth: 1.0 + currentParams.satellite_growth / 100.0,
      mission_growth: 1.0 + currentParams.mission_growth / 100.0,
      launch_frequency: 1.0 + currentParams.launch_frequency / 100.0,
      ground_station_capacity: 1.0 + currentParams.ground_station_capacity / 100.0,
      data_volume: 1.0 + currentParams.data_volume / 100.0,
      bandwidth_capacity: 1.0 + currentParams.bandwidth_capacity / 100.0,
      horizon_years: 3,
    }

    apiService.scenarios(apiPayload as any)
      .then(res => {
        setResult(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Simulation execution error:', err)
        setLoading(false)
      })
  }, [])

  // Debounced trigger on param change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      executeSimulation(params)
    }, 280)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [params, executeSimulation])



  const handleSliderChange = (id: string, val: number) => {
    setParams(prev => ({ ...prev, [id]: val }))
  }

  const applyPreset = (presetName: string) => {
    if (presetName === 'Commercial Mega-Constellation Surge') {
      setParams({
        satellite_growth: 80, mission_growth: 35, launch_frequency: 50,
        ground_station_capacity: 20, data_volume: 75, bandwidth_capacity: 60,
      })
    } else if (presetName === 'Artemis Lunar & Deep-Space Focus') {
      setParams({
        satellite_growth: 15, mission_growth: 30, launch_frequency: 25,
        ground_station_capacity: 40, data_volume: 45, bandwidth_capacity: 35,
      })
    } else if (presetName === 'Fiscal Austerity & Supply Delay') {
      setParams({
        satellite_growth: -25, mission_growth: -20, launch_frequency: -20,
        ground_station_capacity: -10, data_volume: -15, bandwidth_capacity: -10,
      })
    } else {
      setParams({
        satellite_growth: 0, mission_growth: 0, launch_frequency: 0,
        ground_station_capacity: 0, data_volume: 0, bandwidth_capacity: 0,
      })
    }
  }

  const resComp = result?.resource_comparison || {}
  const baseline = resComp.baseline || {
    forecast_demand: 58.0,
    ground_station_util_pct: 64.5,
    storage_requirements_tb: 162.4,
    bandwidth_requirements_gbps: 53.4,
    processing_vcores: 34,
    resource_utilization_pct: 68.0,
  }
  const simulated = resComp.simulated || {
    forecast_demand: 72.5,
    ground_station_util_pct: 78.2,
    storage_requirements_tb: 215.0,
    bandwidth_requirements_gbps: 71.2,
    processing_vcores: 48,
    resource_utilization_pct: 81.5,
  }
  const deltas = resComp.deltas_pct || {
    demand: 25.0,
    ground_station_util: 21.2,
    storage: 32.4,
    bandwidth: 33.3,
    processing: 41.2,
    resource_util: 19.8,
  }

  // Chart time series
  const chartData: any[] = []
  if (result?.scenarios && result.scenarios.length > 0) {
    const baselineScen = result.scenarios.find((s: any) => s.scenario === 'baseline') || result.scenarios[0]
    const customScen = result.scenarios.find((s: any) => s.scenario === 'custom')
    const optimisticScen = result.scenarios.find((s: any) => s.scenario === 'optimistic')
    const conservativeScen = result.scenarios.find((s: any) => s.scenario === 'conservative')

    const years = baselineScen.data.map((d: any) => d.year)
    years.forEach((yr: number) => {
      const bPt = baselineScen.data.find((d: any) => d.year === yr)
      const cPt = customScen?.data?.find((d: any) => d.year === yr)
      const oPt = optimisticScen?.data?.find((d: any) => d.year === yr)
      const consPt = conservativeScen?.data?.find((d: any) => d.year === yr)

      chartData.push({
        year: yr,
        baseline: bPt ? Math.round(bPt.forecast_value || bPt.actual_demand) : null,
        simulated: cPt ? Math.round(cPt.forecast_value || cPt.actual_demand) : null,
        optimistic: oPt ? Math.round(oPt.forecast_value) : null,
        conservative: consPt ? Math.round(consPt.forecast_value) : null,
        lower_bound: cPt?.lower_bound ? Math.round(cPt.lower_bound) : null,
        upper_bound: cPt?.upper_bound ? Math.round(cPt.upper_bound) : null,
      })
    })
  }

  const monteCarlo = result?.monte_carlo || null

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
      
      {/* Enterprise Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 4,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 600,
          }}>
            Stochastic What-If Simulation
          </span>
          <span style={{
            fontSize: '0.75rem', color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            Multi-Parameter Elasticity • Spark In-Memory Inference • Debounced Model Invocation
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '2rem', fontWeight: 700,
              letterSpacing: '-0.02em', lineHeight: 1.2,
              color: 'var(--color-text-primary)', margin: 0,
            }}>
              What-If Scenario Simulator
            </h1>
            <p style={{
              fontSize: '0.85rem', color: 'var(--color-text-secondary)',
              marginTop: '0.4rem', maxWidth: 780, lineHeight: 1.5,
            }}>
              Stress-test downstream ground stations, HDFS analytical storage, downlink bandwidth, and Spark executor workloads under hypothetical launch cadence surges and mega-constellation deployments.
            </p>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['Balanced Baseline', 'Mega-Constellation Surge', 'Lunar Deep-Space', 'Supply Delay'].map(pName => {
              const fullPresetName = pName === 'Balanced Baseline' ? 'Balanced Baseline Growth' :
                                    (pName === 'Mega-Constellation Surge' ? 'Commercial Mega-Constellation Surge' :
                                    (pName === 'Lunar Deep-Space' ? 'Artemis Lunar & Deep-Space Focus' : 'Fiscal Austerity & Supply Delay'))
              return (
                <button
                  key={pName}
                  onClick={() => applyPreset(fullPresetName)}
                  style={{
                    padding: '6px 12px', borderRadius: 4,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = '#FFFFFF' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                >
                  {pName}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Side-by-Side: BASELINE vs SIMULATED SCENARIO Resource Comparison Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem', marginBottom: '1.75rem',
      }}>
        {/* Baseline Card */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '1.25rem', borderLeft: '3px solid #94A3B8' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              BASELINE PROJECTION
            </span>
            <span className="badge" style={{ fontSize: '0.65rem' }}>UNMODIFIED</span>
          </div>

          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.85rem' }}>
            {baseline.forecast_demand} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>missions/yr</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ground Station Load:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{baseline.ground_station_util_pct}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Storage Requirements:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{baseline.storage_requirements_tb} TB</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bandwidth Demand:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{baseline.bandwidth_requirements_gbps} Gbps</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>YARN Spark Vcores:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{baseline.processing_vcores} Cores</strong>
            </div>
          </div>
        </motion.div>

        {/* Delta Shift Card */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(255, 94, 30, 0.06) 0%, rgba(99, 102, 241, 0.06) 100%)',
            border: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            SIMULATED IMPACT DELTA
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 800, color: deltas.demand >= 0 ? 'var(--color-accent)' : 'var(--color-warning)', margin: '0.2rem 0' }}>
            {deltas.demand >= 0 ? '+' : ''}{deltas.demand}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
            Net variance vs historical Spark MLlib baseline
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.7rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: 4 }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Storage:</span> <strong style={{ color: 'var(--color-text-primary)' }}>{deltas.storage >= 0 ? '+' : ''}{deltas.storage}%</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: 4 }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Bandwidth:</span> <strong style={{ color: 'var(--color-text-primary)' }}>{deltas.bandwidth >= 0 ? '+' : ''}{deltas.bandwidth}%</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: 4 }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Station Load:</span> <strong style={{ color: 'var(--color-text-primary)' }}>{deltas.ground_station_util >= 0 ? '+' : ''}{deltas.ground_station_util}%</strong>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: 4 }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Vcores:</span> <strong style={{ color: 'var(--color-text-primary)' }}>{deltas.processing >= 0 ? '+' : ''}{deltas.processing}%</strong>
            </div>
          </div>
        </motion.div>

        {/* Simulated Scenario Card */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: '1.25rem', borderLeft: '3px solid var(--color-accent)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              SIMULATED SCENARIO
            </span>
            <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>ACTIVE EXPERIMENT</span>
          </div>

          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.85rem' }}>
            {simulated.forecast_demand} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>missions/yr</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ground Station Load:</span>
              <strong style={{ color: simulated.ground_station_util_pct > 80 ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                {simulated.ground_station_util_pct}% {simulated.ground_station_util_pct > 80 ? '⚠️' : ''}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Storage Requirements:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{simulated.storage_requirements_tb} TB</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bandwidth Demand:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{simulated.bandwidth_requirements_gbps} Gbps</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>YARN Spark Vcores:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{simulated.processing_vcores} Cores</strong>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Left Controls (6 Interactive Sliders), Right Visual Trajectories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left: 6 Sliders Card */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Interactive Parameter Controls
            </span>
            {loading && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={11} className="spin-slow" /> Inferring...
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {PARAMETERS.map(p => {
              const val = params[p.id] ?? p.default

              return (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {p.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: val > 0 ? 'var(--color-accent)' : (val < 0 ? 'var(--color-warning)' : 'var(--color-text-dim)'),
                    }}>
                      {val > 0 ? '+' : ''}{val}{p.unit}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    onChange={(e) => handleSliderChange(p.id, Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--color-accent)',
                      cursor: 'pointer',
                    }}
                  />

                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                    {p.desc}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            marginTop: '1.5rem', padding: '10px 12px', background: 'var(--color-surface-2)',
            borderRadius: 6, border: '1px solid var(--color-border-dim)', fontSize: '0.72rem',
            color: 'var(--color-text-secondary)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Zero UI Freezing:</strong> Slider parameter changes are debounced at 280ms before triggering asynchronous FastAPI Spark MLlib inference.
          </div>
        </div>

        {/* Right: Charts (Trajectories or Monte Carlo) */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: 6, background: 'var(--color-surface-2)', padding: 3, borderRadius: 6 }}>
              <button
                onClick={() => setActiveTab('trajectories')}
                style={{
                  padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 600,
                  background: activeTab === 'trajectories' ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === 'trajectories' ? '#FFFFFF' : 'var(--color-text-secondary)',
                }}
              >
                Multi-Line Trajectories
              </button>
              <button
                onClick={() => setActiveTab('monte_carlo')}
                style={{
                  padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 600,
                  background: activeTab === 'monte_carlo' ? 'var(--color-accent)' : 'transparent',
                  color: activeTab === 'monte_carlo' ? '#FFFFFF' : 'var(--color-text-secondary)',
                }}
              >
                Monte Carlo Risk Distribution
              </button>
            </div>

            <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
              Horizon: 2026–2029
            </span>
          </div>

          {activeTab === 'trajectories' ? (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-primary)', marginBottom: 4 }}>Year {label}</div>
                        {payload.map((p: any) => (
                          <div key={p.name} style={{ fontSize: '0.75rem', color: p.color, fontFamily: 'var(--font-mono)' }}>
                            {p.name}: {p.value} missions
                          </div>
                        ))}
                      </div>
                    )
                  }} />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 10 }} />
                  <Line type="monotone" dataKey="baseline" name="Baseline Model" stroke="#94A3B8" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="simulated" name="Simulated Scenario" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 4 }} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="optimistic" name="Optimistic Preset" stroke="#10B981" strokeWidth={1.5} dot={false} opacity={0.6} />
                  <Line type="monotone" dataKey="conservative" name="Conservative Preset" stroke="#6366F1" strokeWidth={1.5} dot={false} opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 350 }}>
              {monteCarlo?.distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monteCarlo.distribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="demand" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: 'var(--color-text-dim)', fontSize: 11 }} />
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0]?.payload
                      return (
                        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Demand: {p.demand}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)' }}>Frequency: {p.frequency} runs</div>
                        </div>
                      )
                    }} />
                    <Bar dataKey="frequency" name="Monte Carlo Perturbation Runs" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-dim)' }}>
                  Loading Monte Carlo stochastic distribution...
                </div>
              )}
            </div>
          )}

          {/* Monte Carlo Summary Stats */}
          {monteCarlo && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-dim)',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
            }}>
              <div>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>P10 CONSERVATIVE</span>
                <div style={{ fontWeight: 700, color: '#6366F1' }}>{monteCarlo.p10_conservative}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>P50 MEDIAN</span>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{monteCarlo.p50_median}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>P90 SURGE</span>
                <div style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{monteCarlo.p90_surge}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>VALUE AT RISK (95%)</span>
                <div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{monteCarlo.value_at_risk_95_pct}</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
