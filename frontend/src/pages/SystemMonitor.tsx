import { useEffect, useState } from 'react'
import {
  CheckCircle2, AlertTriangle, XCircle,
  Folder, FileCode, Play, Network
} from 'lucide-react'
import { apiService } from '../services/api'
import { motion } from 'framer-motion'
import { useTelemetrySocket } from '../services/useTelemetrySocket'
import { useAuth } from '../context/AuthContext'

const StatusIcon = ({ status }: { status: string }) => {
  const s = status?.toLowerCase()
  if (s === 'healthy' || s === 'optimal' || s === 'completed' || s === 'nominal' || s === 'succeeded') {
    return <CheckCircle2 size={15} color="var(--color-success)" />
  }
  if (s === 'degraded' || s === 'running' || s === 'warning' || s === 'elevated') {
    return <AlertTriangle size={15} color="var(--color-warning)" />
  }
  return <XCircle size={15} color="var(--color-danger)" />
}

export default function SystemMonitor() {
  const { user } = useAuth()
  const role = user?.role
  const [activeTab, setActiveTab] = useState<'overview' | 'hdfs' | 'hive' | 'jobs'>('overview')

  // Cluster State
  const [cluster, setCluster] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [jobFilter, setJobFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('DEMO_MODE')
  const [faultActionMsg, setFaultActionMsg] = useState<string | null>(null)
  const [injectingFault, setInjectingFault] = useState(false)

  // HDFS State
  const [hdfsTree, setHdfsTree] = useState<any>(null)
  const [selectedDirectory, setSelectedDirectory] = useState<string>('/space/raw')

  // Hive State
  const [hiveQueries, setHiveQueries] = useState<any[]>([])
  const [selectedHiveQuery, setSelectedHiveQuery] = useState<string>('Q1')
  const [hiveExecutionResult, setHiveExecutionResult] = useState<any>(null)
  const [executingHive, setExecutingHive] = useState(false)

  const { connected: wsConnected, latestFrame } = useTelemetrySocket()

  const handleInjectFault = async (subsystem: string, severity: string, message: string) => {
    try {
      setInjectingFault(true)
      const res = await apiService.injectFault({ subsystem, severity, message })
      setFaultActionMsg(`Fault Injected [${res.data.subsystem}]: ${res.data.message}`)
      setTimeout(() => setFaultActionMsg(null), 8000)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to inject fault')
    } finally {
      setInjectingFault(false)
    }
  }

  const handleClearFault = async () => {
    try {
      setInjectingFault(true)
      const res = await apiService.clearFault()
      setFaultActionMsg(res.data.message || 'Faults cleared. Restored to nominal telemetry.')
      setTimeout(() => setFaultActionMsg(null), 8000)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to clear faults')
    } finally {
      setInjectingFault(false)
    }
  }

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      apiService.hadoopCluster(),
      apiService.hadoopJobs({ status: jobFilter }),
      apiService.hadoopHdfsTree(),
      apiService.hadoopHiveQueries(),
    ])
      .then(([clusterRes, jobsRes, hdfsRes, hiveRes]) => {
        setCluster(clusterRes.data)
        setJobs(jobsRes.data.jobs || [])
        setMode(clusterRes.data.mode || 'DEMO_MODE')
        setHdfsTree(hdfsRes.data)
        setHiveQueries(hiveRes.data.queries || [])
        setLoading(false)
      })
      .catch(e => {
        console.error('Failed to load Hadoop cluster diagnostics:', e)
        setLoading(false)
      })
  }

  const handleRunHiveQuery = async (queryId: string) => {
    try {
      setExecutingHive(true)
      const res = await apiService.hadoopExecuteHiveQuery(queryId)
      setHiveExecutionResult(res.data)
    } catch (e) {
      console.error('Hive query execution failed:', e)
    } finally {
      setExecutingHive(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto execute initial query
    handleRunHiveQuery('Q1')
    const interval = setInterval(fetchData, 8000)
    return () => clearInterval(interval)
  }, [jobFilter])

  const hdfs = cluster?.hdfs || {}
  const yarn = cluster?.yarn || {}
  const host = cluster?.host_diagnostics || {}

  const currentHiveQueryObj = hiveQueries.find(q => q.id === selectedHiveQuery) || hiveQueries[0]

  return (
    <div className="page-content" style={{ overflowY: 'auto', height: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
      
      {/* Clean Enterprise Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 4,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 600,
          }}>
            Hadoop Ecosystem Infrastructure
          </span>
          <span style={{
            fontSize: '0.75rem', color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            Mode: {mode} • CPU: {host?.cpu_utilization_pct || 24.5}% • Apache Hadoop 3.3.4 • YARN CapacityScheduler • Hive 3.1.3 • Spark 3.4.0
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '2rem', fontWeight: 700,
              letterSpacing: '-0.02em', lineHeight: 1.2,
              color: 'var(--color-text-primary)', margin: 0,
            }}>
              Hadoop Cluster & Infrastructure
            </h1>
            <p style={{
              fontSize: '0.85rem', color: 'var(--color-text-secondary)',
              marginTop: '0.4rem', maxWidth: 740, lineHeight: 1.5,
            }}>
              Distributed storage, compute cluster topology, HDFS block distribution, and Apache Hive analytical warehousing.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
              background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)',
              borderRadius: 4, border: '1px solid rgba(16,185,129,0.3)',
              fontSize: '0.75rem', fontWeight: 600,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
              Cluster Nominal
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', padding: '6px 12px', borderRadius: 4,
                cursor: loading ? 'wait' : 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Clean Metric Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem', marginBottom: '1.75rem',
      }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">HDFS DATANODES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent)', margin: '0.4rem 0' }}>
            {hdfs.live_datanodes || 12} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>/ {hdfs.total_datanodes || 12}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Replication: 3x • 0 Dead Nodes • 0 Corrupt
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">HDFS STORAGE CAPACITY</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.4rem 0' }}>
            {hdfs.used_storage_tb || 42.6} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>TB</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {hdfs.utilization_pct || 33.3}% of {hdfs.total_capacity_tb || 128.0} TB Pooled
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">YARN VCORE COMPUTE</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)', margin: '0.4rem 0' }}>
            {yarn.allocated_vcores || 34} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>/ {yarn.total_vcores || 96}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {yarn.vcore_utilization_pct || 35.4}% Distributed Compute Pool
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="stat-label">ACTIVE YARN APPLICATIONS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent)', margin: '0.4rem 0' }}>
            {yarn.running_applications || 2} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>Running</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {yarn.completed_jobs || 1420} Succeeded • {yarn.active_containers || 18} Containers
          </div>
        </div>
      </div>

      {/* Clean Navigation Tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem',
      }}>
        {[
          { id: 'overview', label: 'Cluster Topology & Telemetry' },
          { id: 'hdfs', label: 'HDFS File System Browser' },
          { id: 'hive', label: 'Apache Hive Analytical Console' },
          { id: 'jobs', label: 'YARN Distributed Jobs' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            style={{
              padding: '6px 14px', borderRadius: 4,
              border: activeTab === id ? '1px solid var(--color-accent)' : '1px solid transparent',
              background: activeTab === id ? 'rgba(255, 94, 30, 0.1)' : 'transparent',
              color: activeTab === id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Cluster Topology & Live Telemetry */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Live Satellite Telemetry Frame */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '1.5rem', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Live Telemetry Ingestion (WebSocket Stream: space-telemetry)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 2 }}>
                  Downlink buffered directly into HDFS raw storage partition.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
                  background: wsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: wsConnected ? 'var(--color-success)' : 'var(--color-text-dim)',
                  border: `1px solid ${wsConnected ? 'var(--color-success)' : 'var(--color-border)'}`
                }}>
                  {wsConnected ? '● STREAM ONLINE' : '○ CONNECTING...'}
                </span>
                {role === 'ADMIN' && (
                  <button
                    onClick={() => handleInjectFault('THERMAL', 'CRITICAL', 'Simulated radiator bypass valve failure')}
                    disabled={injectingFault}
                    style={{
                      padding: '6px 12px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--color-danger)', color: 'var(--color-danger)',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Inject Fault
                  </button>
                )}
                {role === 'ADMIN' && (
                  <button
                    onClick={handleClearFault}
                    disabled={injectingFault}
                    style={{
                      padding: '6px 12px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Clear Faults
                  </button>
                )}
              </div>
            </div>

            {faultActionMsg && (
              <div style={{
                background: 'rgba(255, 94, 30, 0.1)', border: '1px solid var(--color-accent)',
                padding: '8px 12px', borderRadius: 6, color: 'var(--color-accent)',
                fontSize: '0.8rem', marginBottom: '1rem'
              }}>
                {faultActionMsg}
              </div>
            )}

            {latestFrame ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Thermal Loop</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>
                    {latestFrame.metrics?.temperature_c ?? 22.4}°C
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Radiator Loop 3</div>
                </div>

                <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Solar Bus Power</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-accent)', marginTop: 4 }}>
                    {latestFrame.metrics?.power_usage_w ?? 3420} W
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Sunlight: {Math.round((latestFrame.metrics?.sunlight_fraction ?? 0.85) * 100)}%</div>
                </div>

                <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Li-Ion Battery</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)', marginTop: 4 }}>
                    {latestFrame.metrics?.battery_level_pct ?? 94}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Nominal Discharge</div>
                </div>

                <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Downlink Bandwidth</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-info)', marginTop: 4 }}>
                    {latestFrame.metrics?.data_rate_mbps ?? 120} Mbps
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Carrier Signal -84 dBm</div>
                </div>

                <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Health State</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <StatusIcon status={latestFrame.status === 'NOMINAL' ? 'healthy' : 'warning'} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: latestFrame.status === 'NOMINAL' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {latestFrame.status ?? 'NOMINAL'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: 2 }}>
                    Frame #{latestFrame.frame_id ?? 10842}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', padding: '1rem', textAlign: 'center' }}>
                Connecting to live satellite telemetry stream...
              </div>
            )}
          </div>

          {/* NodeManager / DataNode Matrix */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
              <Network size={18} color="var(--color-accent)" />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                12-Node Distributed Topology (NameNode & DataNodes)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {Array.from({ length: 12 }, (_, i) => {
                const nodeName = `datanode-${String(i + 1).padStart(2, '0')}.space.internal`
                const vcoresUsed = 2 + (i % 3)
                const memUsed = 10 + (i % 5)
                return (
                  <div key={i} style={{
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border-dim)',
                    borderRadius: 6, padding: '12px 14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{nodeName}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                      vCores: {vcoresUsed} / 8 • RAM: {memUsed} / 32 GB
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-accent)', marginTop: 4 }}>
                      Blocks Held: {12000 + i * 840} • HDFS Rep: 3x
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 2: HDFS File System Browser */}
      {activeTab === 'hdfs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
            {/* Folder Tree */}
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '1.25rem', height: 'fit-content'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.08em' }}>
                HDFS NAMESPACE (/space)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(hdfsTree?.directories || []).map((dir: any) => {
                  const isSelected = selectedDirectory === dir.path
                  return (
                    <button
                      key={dir.path}
                      onClick={() => setSelectedDirectory(dir.path)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 6,
                        border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                        background: isSelected ? 'rgba(255, 94, 30, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                        cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500
                      }}
                    >
                      <Folder size={15} color={isSelected ? 'var(--color-accent)' : 'var(--color-text-dim)'} />
                      <span style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>{dir.path}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>
                        ({dir.children?.length || 0})
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: '1.5rem', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                <div><strong>Default Block Size:</strong> 128 MB</div>
                <div><strong>Replication Factor:</strong> 3x</div>
                <div><strong>Block Pool:</strong> BP-774921-127.0.0.1</div>
                <div><strong>NameNode:</strong> Active (node-master-01)</div>
              </div>
            </div>

            {/* File List & Block Inspector */}
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '1.5rem'
            }}>
              {(() => {
                const currentDir = (hdfsTree?.directories || []).find((d: any) => d.path === selectedDirectory)
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                          {currentDir?.path}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                          {currentDir?.description}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                        Owner: {currentDir?.owner}:{currentDir?.group} • {currentDir?.permissions}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(currentDir?.children || []).map((file: any) => (
                        <div key={file.path} style={{
                          background: 'var(--color-surface-2)', border: '1px solid var(--color-border-dim)',
                          borderRadius: 6, padding: '12px 16px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileCode size={16} color="var(--color-accent)" />
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{file.name}</span>
                              <span style={{
                                padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem',
                                background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-secondary)',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {file.format}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                              {file.size_mb} MB
                            </span>
                          </div>

                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '1.5rem',
                            fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: 6,
                            paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.03)'
                          }}>
                            <span>Blocks: <strong>{file.blocks}</strong> (128 MB chunking)</span>
                            <span>Replication: <strong>{file.replication}x</strong></span>
                            <span>DataNode Allocation: <strong style={{ color: 'var(--color-accent)' }}>{(file.assigned_datanodes || []).join(', ')}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Apache Hive Analytical Console */}
      {activeTab === 'hive' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem' }}>
            {/* Query Selector */}
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '1.25rem', height: 'fit-content'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.08em' }}>
                11 HIVE ANALYTICAL QUERIES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '600px', overflowY: 'auto' }}>
                {hiveQueries.map((q: any) => {
                  const isSelected = selectedHiveQuery === q.id
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedHiveQuery(q.id)
                        handleRunHiveQuery(q.id)
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        padding: '10px 12px', borderRadius: 6,
                        border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                        background: isSelected ? 'rgba(255, 94, 30, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-dim)' }}>
                          [{q.id}] {q.category}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>
                          {q.complexity?.split(' ')[0]}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 3 }}>
                        {q.title}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SQL Viewer & Execution DAG */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* SQL Panel */}
              <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Query {currentHiveQueryObj?.id} // {currentHiveQueryObj?.category}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>
                      {currentHiveQueryObj?.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleRunHiveQuery(selectedHiveQuery)}
                    disabled={executingHive}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 6, border: 'none',
                      background: 'var(--color-accent)', color: '#FFFFFF',
                      fontSize: '0.75rem', fontWeight: 700, cursor: executingHive ? 'wait' : 'pointer'
                    }}
                  >
                    <Play size={13} />
                    {executingHive ? 'Running on Spark/Hive...' : 'Execute on Cluster'}
                  </button>
                </div>

                <pre style={{
                  background: '#070709', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 6, padding: '1rem', color: '#E2E8F0',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.6,
                  overflowX: 'auto', margin: 0
                }}>
                  <code>{currentHiveQueryObj?.sql}</code>
                </pre>
              </div>

              {/* Execution Results Grid */}
              {hiveExecutionResult && (
                <div style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Result Preview ({hiveExecutionResult.record_count} records returned in {hiveExecutionResult.execution_plan?.total_latency_ms} ms)
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Engine: {hiveExecutionResult.execution_plan?.execution_engine}
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', maxHeight: 280 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                          {(hiveExecutionResult.columns || []).map((col: string) => (
                            <th key={col} style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(hiveExecutionResult.records || []).slice(0, 8).map((row: any, rIdx: number) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border-dim)' }}>
                            {(hiveExecutionResult.columns || []).map((col: string) => (
                              <td key={col} style={{ padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Distributed DAG Stages */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-dim)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      DISTRIBUTED EXECUTION PLAN & DAG STAGES
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {(hiveExecutionResult.execution_plan?.stages || []).map((st: any) => (
                        <div key={st.stage_id} style={{
                          background: 'var(--color-surface-2)', border: '1px solid var(--color-border-dim)',
                          borderRadius: 6, padding: '10px 12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFFFFF' }}>{st.stage_id}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 700 }}>{st.status}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                            {st.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                            Operator: {st.operator} • Latency: {st.duration_ms} ms
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 4: YARN Distributed Jobs */}
      {activeTab === 'jobs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  YARN Application Queue & Distributed Tasks
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                  Active and completed PySpark, Spark MLlib, and MapReduce analytics jobs.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {['ALL', 'RUNNING', 'COMPLETED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setJobFilter(st)}
                    style={{
                      padding: '4px 10px', borderRadius: 4, border: 'none',
                      background: jobFilter === st ? 'var(--color-accent)' : 'var(--color-surface-2)',
                      color: jobFilter === st ? '#FFFFFF' : 'var(--color-text-secondary)',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>APPLICATION ID</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>JOB NAME</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>FRAMEWORK</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>TASKS</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>INPUT / OUTPUT</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j: any) => (
                    <tr key={j.job_id} style={{ borderBottom: '1px solid var(--color-border-dim)' }}>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                        {j.job_id}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {j.job_name}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {j.framework}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700,
                          background: j.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 94, 30, 0.15)',
                          color: j.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-accent)'
                        }}>
                          <StatusIcon status={j.status} />
                          {j.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {j.tasks_completed} / {j.tasks_total}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}>
                        {j.input_size_mb} MB → {j.output_size_mb} MB
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {j.duration_seconds}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
