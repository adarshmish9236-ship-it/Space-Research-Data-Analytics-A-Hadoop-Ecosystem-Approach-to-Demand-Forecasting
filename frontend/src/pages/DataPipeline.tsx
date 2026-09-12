import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Database, Server, Cpu, Binary, Radio, HardDrive,
  BrainCircuit, ArrowDown, RefreshCw, ShieldCheck, Zap
} from 'lucide-react'
import { apiService } from '../services/api'

interface PipelineStage {
  id: string
  stage_number: number
  name: string
  category: string
  tech_stack: string
  status: 'ONLINE' | 'PROCESSING' | 'IDLE' | 'WARNING' | 'ERROR'
  status_label: string
  throughput: string
  latency_ms: number
  mode: string
  summary: string
  metrics: Record<string, any>
  context_details: { label: string; value: string | number }[]
}

const STAGE_ICONS: Record<string, any> = {
  'stage-sources': Radio,
  'stage-kafka': Zap,
  'stage-hdfs': HardDrive,
  'stage-yarn': Server,
  'stage-spark-etl': Cpu,
  'stage-feature-engineering': Binary,
  'stage-parquet': Database,
  'stage-mllib': BrainCircuit,
  'stage-serving': Layers,
}

export default function DataPipeline() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [kafkaMetrics, setKafkaMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = () => {
    Promise.all([
      apiService.pipelineStages(),
      apiService.kafkaMetrics(),
    ])
      .then(([stagesRes, kafkaRes]) => {
        const fetched = stagesRes.data.stages || []
        setStages(fetched)
        setKafkaMetrics(kafkaRes.data)
        if (!selectedStage && fetched.length > 0) {
          // Default to HDFS or Spark node
          setSelectedStage(fetched[2] || fetched[0])
        } else if (selectedStage) {
          const updated = fetched.find((s: PipelineStage) => s.id === selectedStage.id)
          if (updated) setSelectedStage(updated)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load data pipeline telemetry:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
    if (!autoRefresh) return
    const timer = setInterval(fetchData, 6000)
    return () => clearInterval(timer)
  }, [autoRefresh])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ONLINE</span>
      case 'PROCESSING':
        return <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>PROCESSING</span>
      case 'WARNING':
        return <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>WARNING</span>
      case 'ERROR':
        return <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>ERROR</span>
      default:
        return <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)' }}>IDLE</span>
    }
  }

  if (loading && !stages.length) {
    return (
      <div className="page-content" style={{ padding: '2rem' }}>
        <div className="skeleton" style={{ height: 80, marginBottom: '1.5rem', borderRadius: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: 500, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 500, borderRadius: 8 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
      
      {/* Top Academic Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 8px', borderRadius: 4,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 600,
            }}>
              Hadoop Ecosystem Architecture
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              Data Sources → Kafka → HDFS → YARN → Spark ETL → Feature Engineering → Parquet → MLlib → Serving
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem', fontWeight: 700,
            letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0,
          }}>
            Distributed Data Pipeline Visualizer
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: 820, lineHeight: 1.5 }}>
            Interactive end-to-end Big Data lifecycle. Inspect distributed node health, block replication, YARN container allocations, in-memory RDD caching, and Spark MLlib pipeline stages.
          </p>
        </div>

        {/* Live Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 4,
              background: autoRefresh ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-2)',
              border: `1px solid ${autoRefresh ? 'var(--color-success)' : 'var(--color-border)'}`,
              color: autoRefresh ? 'var(--color-success)' : 'var(--color-text-secondary)',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={autoRefresh ? 'spin-slow' : ''} />
            {autoRefresh ? 'Live Polling (6s)' : 'Polling Paused'}
          </button>
        </div>
      </div>

      {/* Real-Time Kafka Stream Monitor Banner */}
      {kafkaMetrics && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(90deg, rgba(255, 94, 30, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 6,
              background: 'rgba(255, 94, 30, 0.15)', border: '1px solid var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Zap size={20} color="var(--color-accent)" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Apache Kafka Streaming Engine Active
                <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>STREAM ONLINE</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Broker: {kafkaMetrics.broker_cluster} • Version: {kafkaMetrics.version} • ISR Quorum: 3x
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontFamily: 'var(--font-mono)' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Throughput</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                {kafkaMetrics.messages_per_second?.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>msg/s</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Consumer Lag</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: kafkaMetrics.consumer_lag > 50 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {kafkaMetrics.consumer_lag} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>records</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Events Streamed</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {kafkaMetrics.total_events_processed?.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Workspace: Left Interactive Pipeline Graph, Right Context Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Left: Architecture Flow Graph */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Pipeline Topology (Click any stage to inspect)
          </div>

          {stages.map((st, idx) => {
            const Icon = STAGE_ICONS[st.id] || Layers
            const isSelected = selectedStage?.id === st.id

            return (
              <div key={st.id}>
                <motion.div
                  onClick={() => setSelectedStage(st)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  style={{
                    background: isSelected ? 'rgba(255, 94, 30, 0.08)' : 'var(--color-surface)',
                    border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 8,
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 16px rgba(255, 94, 30, 0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Node Number & Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 6,
                      background: isSelected ? 'var(--color-accent)' : 'var(--color-surface-2)',
                      color: isSelected ? '#FFFFFF' : 'var(--color-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      <Icon size={18} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                          {st.stage_number}. {st.name}
                        </span>
                        {getStatusBadge(st.status)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {st.tech_stack}
                      </div>
                    </div>
                  </div>

                  {/* Throughput & Latency */}
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {st.throughput}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginTop: 2 }}>
                      {st.latency_ms} ms latency
                    </div>
                  </div>
                </motion.div>

                {/* Arrow connector between stages */}
                {idx < stages.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 0' }}>
                    <ArrowDown size={14} color="var(--color-border)" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Selected Node Contextual Inspector */}
        <AnimatePresence mode="wait">
          {selectedStage && (
            <motion.div
              key={selectedStage.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="card"
              style={{
                position: 'sticky',
                top: '1rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '1.5rem',
              }}
            >
              {/* Header */}
              <div style={{ borderBottom: '1px solid var(--color-border-dim)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Stage {selectedStage.stage_number} • {selectedStage.category}
                  </span>
                  {getStatusBadge(selectedStage.status)}
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
                  {selectedStage.name}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedStage.tech_stack}
                </div>
              </div>

              {/* Mode Badge (Clean, clear labeling of real vs simulated) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border-dim)',
                borderRadius: 6, padding: '8px 12px', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <ShieldCheck size={16} color="var(--color-success)" />
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Execution Mode:</strong> {selectedStage.mode}
                </div>
              </div>

              {/* Summary */}
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                {selectedStage.summary}
              </p>

              {/* Key Telemetry Metrics Grid */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Operational Telemetry Metrics
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {Object.entries(selectedStage.metrics).map(([k, v]) => {
                    const label = k.replace(/_/g, ' ').toUpperCase()
                    const displayVal = Array.isArray(v) ? v.join(', ') : (typeof v === 'number' ? v.toLocaleString() : String(v))

                    return (
                      <div key={k} style={{
                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border-dim)',
                        borderRadius: 6, padding: '8px 10px',
                      }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}>
                          {label}
                        </div>
                        <div style={{
                          fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)',
                          fontFamily: typeof v === 'number' ? 'var(--font-mono)' : 'inherit',
                          marginTop: 3, wordBreak: 'break-word',
                        }}>
                          {displayVal}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Contextual Architecture Details List */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Deep Configuration & Architecture
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedStage.context_details.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 10px', background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 4, border: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: '0.75rem',
                    }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
