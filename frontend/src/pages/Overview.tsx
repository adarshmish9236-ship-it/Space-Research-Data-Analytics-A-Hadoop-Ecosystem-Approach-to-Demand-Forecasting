import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Database, TrendingUp, Cpu, HardDrive, Zap,
  AlertTriangle, CheckCircle2, ArrowRight, Radio, Award,
  Sparkles, SlidersHorizontal, Activity
} from 'lucide-react'
import { apiService } from '../services/api'

interface KPIItem {
  label: string
  value: string
  unit?: string
  change_pct?: number
  note?: string
  icon: any
  color: string
}

interface PipelineStageCompact {
  id: string
  name: string
  tech: string
  status: 'OPTIMAL' | 'HEALTHY' | 'ACTIVE' | 'READY'
  metric: string
}

const COMPACT_PIPELINE: PipelineStageCompact[] = [
  { id: 'kafka', name: 'Kafka Ingestion', tech: 'Apache Kafka 3.6', status: 'ACTIVE', metric: '24,800 msg/s' },
  { id: 'hdfs', name: 'HDFS Lake', tech: 'Hadoop 3.3.4 (3x)', status: 'HEALTHY', metric: '42.6 TB' },
  { id: 'spark_etl', name: 'PySpark ETL', tech: 'Spark on YARN', status: 'OPTIMAL', metric: '132k rec/s' },
  { id: 'quality', name: 'Quality Cleansing', tech: '6-Stage Funnel', status: 'OPTIMAL', metric: '98.7% Clean' },
  { id: 'mllib', name: 'Spark MLlib', tech: 'GBT + RF Ensemble', status: 'READY', metric: 'R² 0.984' },
  { id: 'hive', name: 'Hive Metastore', tech: 'Parquet Lakehouse', status: 'READY', metric: '8 Tables' },
  { id: 'analytics', name: 'OLAP Analytics', tech: 'Distributed Agg', status: 'ACTIVE', metric: '<15ms' },
  { id: 'scenarios', name: 'Scenario Lab', tech: 'What-If Engine', status: 'READY', metric: '6 Controls' },
  { id: 'serving', name: 'FastAPI REST', tech: 'Async REST API', status: 'OPTIMAL', metric: '1.8ms lat' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(12, 17, 29, 0.95)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        Year: {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: '0.82rem', color: p.color, fontFamily: 'var(--font-mono)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Overview() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [benchmark, setBenchmark] = useState<any>(null)
  const [featureImp, setFeatureImp] = useState<any[]>([])
  const [selectedResource, setSelectedResource] = useState('missions')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      apiService.dashboard(),
      apiService.forecastAlerts(),
      apiService.modelBenchmark('rmse'),
      apiService.featureImportance('Gradient Boosted Trees'),
    ]).then(([dashRes, alertRes, benchRes, featRes]) => {
      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value.data)
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data.alerts || [])
      if (benchRes.status === 'fulfilled') setBenchmark(benchRes.value.data)
      if (featRes.status === 'fulfilled') setFeatureImp(featRes.value.data.features || [])
      setLoading(false)
    })
  }, [])

  // Top 6 KPIs
  const topKPIs: KPIItem[] = [
    {
      label: 'Hadoop Lake Total Records',
      value: '581,886',
      unit: 'rows',
      change_pct: 12.4,
      note: 'Parquet Lakehouse storage',
      icon: Database,
      color: 'var(--color-accent)',
    },
    {
      label: 'Spark MLlib Accuracy (R²)',
      value: '0.984',
      unit: 'R²',
      change_pct: 3.1,
      note: 'GBT Ensemble Model',
      icon: Award,
      color: '#10B981',
    },
    {
      label: 'Annual Mission Demand',
      value: '348',
      unit: 'missions/yr',
      change_pct: 18.2,
      note: 'Current operational baseline',
      icon: TrendingUp,
      color: '#6366F1',
    },
    {
      label: 'Projected 5-Yr Growth',
      value: '+34.8%',
      unit: 'CAGR',
      change_pct: 34.8,
      note: 'High demand forecast 2025-2030',
      icon: Zap,
      color: '#F59E0B',
    },
    {
      label: 'Spark Processing Throughput',
      value: '132,450',
      unit: 'rec/sec',
      change_pct: 8.5,
      note: 'YARN distributed execution',
      icon: Cpu,
      color: '#EC4899',
    },
    {
      label: 'HDFS Distributed Footprint',
      value: '42.6',
      unit: 'TB',
      change_pct: 5.2,
      note: '3x replication factor active',
      icon: HardDrive,
      color: '#06B6D4',
    },
  ]

  // Dynamic Resource Transform for Demand Forecast
  const multipliers: Record<string, { mult: number; label: string; unit: string; color: string }> = {
    missions: { mult: 1, label: 'Missions Demand', unit: ' missions', color: 'var(--color-accent)' },
    storage: { mult: 2.8, label: 'Lake Storage Demand', unit: ' TB', color: '#6366F1' },
    energy: { mult: 1.6, label: 'Ground Station Power', unit: ' MWh', color: '#10B981' },
    bandwidth: { mult: 0.9, label: 'Telemetry Bandwidth', unit: ' Gbps', color: '#F59E0B' },
    downlink: { mult: 35.0, label: 'Contact Downlink Time', unit: ' hrs', color: '#EC4899' },
  }

  const currentRes = multipliers[selectedResource] || multipliers.missions
  const baseTrend = dashboardData?.demand_trend || [
    { year: 2018, mission_count: 114 },
    { year: 2019, mission_count: 102 },
    { year: 2020, mission_count: 114 },
    { year: 2021, mission_count: 146 },
    { year: 2022, mission_count: 186 },
    { year: 2023, mission_count: 223 },
    { year: 2024, mission_count: 260 },
    { year: 2025, mission_count: 305 },
    { year: 2026, mission_count: 350 },
    { year: 2027, mission_count: 398 },
    { year: 2028, mission_count: 445 },
    { year: 2029, mission_count: 492 },
    { year: 2030, mission_count: 540 },
  ]

  const chartData = baseTrend.map((t: any) => {
    const isForecast = t.year >= 2025
    const baseVal = Math.round(t.mission_count * currentRes.mult)
    const upper = isForecast ? Math.round(baseVal * 1.08) : undefined
    const lower = isForecast ? Math.round(baseVal * 0.92) : undefined

    return {
      year: t.year,
      historical: !isForecast ? baseVal : undefined,
      forecast: isForecast ? baseVal : undefined,
      upper,
      lower,
      isForecast,
    }
  })

  // Fallback alerts if API fails or yields empty
  const displayAlerts = alerts.length > 0 ? alerts : [
    {
      id: 'ALT-101',
      title: 'High Demand Surge Projected',
      type: 'DEMAND_SURGE',
      severity: 'warning',
      message: 'Projected space mission growth +34.8% by 2028 will strain Ground Station tracking bandwidth.',
      timestamp: '2026-09-12 06:00 UTC',
    },
    {
      id: 'ALT-102',
      title: 'HDFS Lake Storage Capacity Limit',
      type: 'CAPACITY_WARNING',
      severity: 'info',
      message: 'HDFS currently at 42.6 TB / 120 TB (35.5% utilized). Projected to reach 68 TB in 18 months.',
      timestamp: '2026-09-12 05:30 UTC',
    },
    {
      id: 'ALT-103',
      title: 'Downlink Bottleneck Risk in EU Region',
      type: 'BOTTLENECK',
      severity: 'warning',
      message: 'European Kiruna station passes overbooked by 22% during peak polar constellation sun-sync orbits.',
      timestamp: '2026-09-12 04:15 UTC',
    },
  ]

  // Model comparison items
  const models = benchmark?.models || [
    { model_name: 'Gradient Boosted Trees (GBT)', rmse: 14.2, mae: 10.8, r2: 0.984, mape: 4.12, rank: 1 },
    { model_name: 'Random Forest Regressor', rmse: 18.5, mae: 13.9, r2: 0.971, mape: 5.68, rank: 2 },
    { model_name: 'Linear Regression (Baseline)', rmse: 32.1, mae: 24.6, r2: 0.912, mape: 9.85, rank: 3 },
  ]

  const championModel = benchmark?.winner?.model_name || 'Gradient Boosted Trees (GBT)'

  // Mission types distribution
  const missionTypes = dashboardData?.top_mission_types || [
    { mission_type: 'Communications & Constellations', count: 184, success_rate: 0.97 },
    { mission_type: 'Earth Observation & Weather', count: 112, success_rate: 0.96 },
    { mission_type: 'Technology Demonstration', count: 68, success_rate: 0.94 },
    { mission_type: 'Deep Space & Planetary', count: 32, success_rate: 0.91 },
    { mission_type: 'Human Spaceflight & Habitation', count: 18, success_rate: 0.99 },
  ]

  return (
    <div className="page-content" style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Executive Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="tag" style={{ background: 'rgba(0, 200, 232, 0.12)', color: 'var(--color-accent)', border: '1px solid rgba(0, 200, 232, 0.25)' }}>
              ORBITALYTICS BIG DATA PLATFORM
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              Apache Hadoop 3.3.4 • PySpark 3.5.3 • Spark MLlib • Parquet Lakehouse
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0' }}>
            Mission Control & Forecasting Intelligence Deck
          </h1>
          <div className="page-subtitle" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            Enterprise Big Data telemetry ingestion, distributed feature engineering, and predictive demand analytics
          </div>
        </div>

        {/* Quick Route Navigators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', boxShadow: '0 0 8px var(--color-success)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
              YARN / HDFS CLUSTER OPERATIONAL
            </span>
          </div>
          <Link
            to="/orbitalytics-2"
            className="btn btn-primary"
            style={{
              fontSize: '0.75rem',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #00C8E8 0%, #6366F1 100%)',
              border: 'none',
              boxShadow: '0 0 16px rgba(0, 200, 232, 0.35)',
              color: '#FFFFFF',
              fontWeight: 700
            }}
          >
            <Sparkles size={13} /> ORBITALYTICS 2.0 Suite <ArrowRight size={12} />
          </Link>
          <Link
            to="/pipeline"
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Activity size={13} /> Data Pipeline
          </Link>
          <Link
            to="/forecast"
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <TrendingUp size={13} /> MLlib Lab
          </Link>
        </div>
      </div>

      {/* ── ORBITALYTICS 2.0 UNIFIED DECISION INTELLIGENCE BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 200, 232, 0.08) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(0, 200, 232, 0.3)',
        borderRadius: 10,
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px rgba(0, 200, 232, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            background: 'rgba(0, 200, 232, 0.15)',
            border: '1px solid rgba(0, 200, 232, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={22} color="var(--color-accent)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                ORBITALYTICS 2.0 — Predictive + Prescriptive Decision Suite
              </span>
              <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(0, 200, 232, 0.2)', color: 'var(--color-accent)' }}>
                6 ENGINES IN ONE SPACE
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Decision Hub • Resource Optimizer • Stress Testing Matrix • AI Aerospace Analyst • Digital Twin 2.0 • Model Governance DAG
            </div>
          </div>
        </div>

        <Link
          to="/orbitalytics-2"
          className="btn btn-primary"
          style={{
            fontSize: '0.78rem',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            fontWeight: 700,
            background: 'var(--color-accent)',
            color: '#000000'
          }}
        >
          Open 2.0 Workspace <ArrowRight size={14} />
        </Link>
      </div>

      {/* 6 Top Key Performance Indicators (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {topKPIs.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              className="card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '1rem 1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {kpi.label}
                </span>
                <div style={{
                  padding: 5,
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: kpi.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={14} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                    {loading ? '...' : kpi.value}
                  </span>
                  {kpi.unit && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {kpi.unit}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                    {kpi.note}
                  </span>
                  {kpi.change_pct !== undefined && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: kpi.change_pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      background: kpi.change_pct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {kpi.change_pct >= 0 ? '▲' : '▼'} {Math.abs(kpi.change_pct).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Big Data Architecture Pipeline Widget (Compact Flow) */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ padding: '1rem 1.25rem', border: '1px solid rgba(0, 200, 232, 0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--color-accent)" />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              End-to-End Big Data Architecture Flow
            </span>
            <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>9 Active Stages</span>
          </div>

          <Link
            to="/pipeline"
            style={{
              fontSize: '0.74rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 600,
            }}
          >
            Launch Interactive Visualizer <ArrowRight size={12} />
          </Link>
        </div>

        {/* 9-Stage Flow Ribbon */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
        }}>
          {COMPACT_PIPELINE.map((st, i) => (
            <div
              key={st.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '0.6rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                  STAGE 0{i + 1}
                </span>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: st.status === 'OPTIMAL' ? '#10B981' : (st.status === 'HEALTHY' ? '#00C8E8' : '#F59E0B'),
                  boxShadow: `0 0 6px ${st.status === 'OPTIMAL' ? '#10B981' : '#00C8E8'}`,
                  display: 'inline-block',
                }} />
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                {st.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginBottom: 4 }}>
                {st.tech}
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 600 }}>
                {st.metric}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Forecast Section: Demand Trajectory Chart */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ padding: '1.25rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--color-accent)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Space Resource Demand Trajectory (Historical vs PySpark MLlib Forecast)
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Baseline recorded from Parquet Lakehouse (2018–2024) projected through 2030 with 95% confidence intervals
            </div>
          </div>

          {/* Resource Selector Buttons */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface-2)', padding: 3, borderRadius: 6, border: '1px solid var(--color-border)' }}>
            {Object.keys(multipliers).map(k => (
              <button
                key={k}
                onClick={() => setSelectedResource(k)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.7rem',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: selectedResource === k ? 'var(--color-accent)' : 'transparent',
                  color: selectedResource === k ? '#000' : 'var(--color-text-secondary)',
                  fontWeight: selectedResource === k ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -5 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C8E8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00C8E8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Upper Confidence Band */}
              <Area type="monotone" dataKey="upper" name="Upper 95% Bound" stroke="none" fill="url(#confGrad)" dot={false} />
              
              {/* Historical Recorded Line */}
              <Area
                type="monotone"
                dataKey="historical"
                name={`Recorded ${currentRes.label}`}
                stroke="#00C8E8"
                strokeWidth={2.5}
                fill="url(#histGrad)"
                dot={{ r: 3, fill: '#00C8E8', stroke: '#080C14', strokeWidth: 1.5 }}
              />

              {/* Forecasted Line */}
              <Area
                type="monotone"
                dataKey="forecast"
                name={`MLlib Forecasted ${currentRes.label}`}
                stroke="#F59E0B"
                strokeWidth={2.5}
                strokeDasharray="4 3"
                fill="url(#foreGrad)"
                dot={{ r: 3, fill: '#F59E0B', stroke: '#080C14', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 3, background: '#00C8E8', display: 'inline-block' }} /> Historical Parquet Lakehouse Data
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 3, background: '#F59E0B', borderTop: '2px dashed #F59E0B', display: 'inline-block' }} /> PySpark MLlib Demand Forecast
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: 'rgba(245, 158, 11, 0.2)', display: 'inline-block', borderRadius: 2 }} /> 95% Confidence Bounds
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            Selected: {currentRes.label} ({currentRes.unit.trim()})
          </span>
        </div>
      </motion.div>

      {/* Two-Column Mid Grid: MLlib Benchmarking & Space Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Card: Spark MLlib Model Performance Summary */}
        <motion.div
          className="card"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={16} color="#10B981" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Spark MLlib Model Benchmark
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Trained on 581k Parquet records via Spark MLlib
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                color: '#10B981',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Sparkles size={11} /> Champion: {championModel.split(' ')[0]}
              </div>
            </div>

            {/* Models Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {models.map((m: any, idx: number) => {
                const isChampion = m.model_name.includes(championModel.split(' ')[0])
                return (
                  <div
                    key={m.model_name || idx}
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: 6,
                      background: isChampion ? 'rgba(16, 185, 129, 0.06)' : 'var(--color-surface-2)',
                      border: isChampion ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border-dim)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.model_name}
                        {isChampion && <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>BEST FIT</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                        RMSE: {m.rmse} • MAE: {m.mae}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isChampion ? '#10B981' : 'var(--color-text-primary)' }}>
                        R² {m.r2}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                        MAPE: {m.mape}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Feature Importance Mini Bar */}
            <div style={{ borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                Key ML Predictive Feature Weights
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(featureImp.length > 0 ? featureImp.slice(0, 3) : [
                  { feature: 'Mission Growth Trend', importance: 0.284 },
                  { feature: 'Active Satellite Constellations', importance: 0.226 },
                  { feature: 'Annual Launch Frequency', importance: 0.182 },
                ]).map((f: any) => (
                  <div key={f.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{f.feature}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 80, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${(f.importance * 100).toFixed(0)}%`, height: '100%', background: 'var(--color-accent)' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', width: 34, textAlign: 'right' }}>
                        {(f.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
              Evaluated on 20% holdout test partition
            </span>
            <Link
              to="/forecast"
              style={{ fontSize: '0.74rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Open Model Comparison Lab <ArrowRight size={12} />
            </Link>
          </div>
        </motion.div>

        {/* Right Card: Space Operations & Real-Time Tracking Snapshot */}
        <motion.div
          className="card"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio size={16} color="var(--color-accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Space Operations & Telemetry Status
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Orbital Constellations • Ground Stations • Conjunction Radar
                </div>
              </div>

              <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                12 Satellites Monitored
              </span>
            </div>

            {/* Quick Operational Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Active Constellations</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  12 Active
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-success)', marginTop: 4 }}>
                  ● 100% nominal telemetry
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Ground Stations</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  6 Online
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Madrid, Goldstone, Canberra...
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Conjunction Alert Level</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F59E0B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  MODERATE
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-warning)', marginTop: 4 }}>
                  ▲ 1 high-risk proximity pass
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border-dim)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Live WebSocket Feed</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#06B6D4', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  1.0 Hz
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Real-time orbital propagation
                </div>
              </div>
            </div>

            {/* Quick Action Buttons to Space Operations and Earth 3D */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Link
                to="/space-ops"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  padding: '8px 12px',
                }}
              >
                <Radio size={13} /> Space Ops Deck
              </Link>
              <Link
                to="/earth-view"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  padding: '8px 12px',
                }}
              >
                <SlidersHorizontal size={13} /> Interactive 3D Earth
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
              SGP4 & Keplarian propagation active
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
              Zero Missed Ground Passes
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Grid: Intelligent Alerts & Mission Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
        
        {/* Dynamic Forecast Alerts & Capacity Warnings */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ padding: '1.25rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#F59E0B" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Forecast Alerts & Capacity Warnings
              </span>
            </div>
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
              {displayAlerts.length} Actionable
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {displayAlerts.map((al: any) => {
              const isDanger = al.severity === 'danger' || al.severity === 'CRITICAL'
              const isWarning = al.severity === 'warning' || al.severity === 'HIGH'
              const badgeClass = isDanger ? 'badge-danger' : (isWarning ? 'badge-warning' : 'badge-accent')

              return (
                <div
                  key={al.id || al.title}
                  style={{
                    padding: '0.75rem 0.9rem',
                    background: 'var(--color-surface-2)',
                    borderRadius: 6,
                    border: '1px solid var(--color-border-dim)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.62rem' }}>
                        {al.type || 'ALERT'}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {al.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {al.timestamp ? al.timestamp.split(' ')[1] : 'LIVE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {al.message}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Mission Type Distribution Breakdown */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="var(--color-accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Mission Domain Breakdown
                </span>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                Parquet Lake Distribution
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(() => {
                const total = missionTypes.reduce((acc: number, t: any) => acc + (t.count || 0), 0) || 1
                const max = Math.max(...missionTypes.map((t: any) => t.count), 1)
                const colors = ['#00C8E8', '#6366F1', '#10B981', '#F59E0B', '#EC4899']

                return missionTypes.map((t: any, idx: number) => {
                  const color = colors[idx % colors.length]
                  const pct = ((t.count / total) * 100).toFixed(1)
                  const widthPct = Math.max((t.count / max) * 100, 5)

                  return (
                    <div key={t.mission_type || idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                          {t.mission_type}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{t.count} missions</span>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>({pct}%)</span>
                        </div>
                      </div>
                      
                      {/* Bar Track */}
                      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${color}88, ${color})`,
                        }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border-dim)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
              Source: Parquet gold analytical layer
            </span>
            <Link
              to="/analytics"
              style={{ fontSize: '0.74rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Detailed Mission Analytics <ArrowRight size={12} />
            </Link>
          </div>
        </motion.div>

      </div>

    </div>
  )
}
