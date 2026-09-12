import { useEffect, useState, useMemo } from 'react'
import {
  Database, Search, Download, RefreshCw, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, X, FileCode, BarChart3,
  ChevronDown, ChevronUp, Hash, Type, ToggleLeft, Tag
} from 'lucide-react'
import { apiService } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ────────────────────────────────────────────────────────────────────
interface ColStat {
  column: string
  dtype: string
  type_class: 'numeric' | 'categorical' | 'boolean' | 'other'
  null_count: number
  null_pct: number
  total_count: number
  unique_count?: number
  min?: number | null
  max?: number | null
  mean?: number | null
  std?: number | null
  top_values?: { value: string; count: number }[]
  true_count?: number
  false_count?: number
  true_pct?: number
}

interface DatasetStats {
  dataset: string
  total_rows: number
  total_columns: number
  query_time_ms: number
  columns: ColStat[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number | null | undefined, decimals = 2): string => {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return v.toFixed(decimals)
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  numeric:     { icon: <Hash size={10} />,      color: '#3b82f6', label: 'NUM' },
  categorical: { icon: <Tag size={10} />,        color: '#a855f7', label: 'CAT' },
  boolean:     { icon: <ToggleLeft size={10} />, color: '#10b981', label: 'BOOL' },
  other:       { icon: <Type size={10} />,        color: '#f59e0b', label: 'STR' },
}

// ── Mini fill bar ─────────────────────────────────────────────────────────────
function FillBar({ pct, color = 'var(--color-accent)' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: color, borderRadius: 2 }}
      />
    </div>
  )
}

// ── Single column stat card ───────────────────────────────────────────────────
function ColStatCard({ stat, totalRows }: { stat: ColStat; totalRows: number }) {
  const meta = TYPE_META[stat.type_class] || TYPE_META.other
  const fillPct = totalRows > 0 ? ((totalRows - stat.null_count) / totalRows) * 100 : 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-dim)',
        borderRadius: 8, padding: '0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={stat.column}>
          {stat.column.replace(/_/g, ' ')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', fontWeight: 700, color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}40`, padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {meta.icon}{meta.label}
        </span>
      </div>

      {/* Completeness bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>Completeness</span>
          <span style={{ fontSize: '0.6rem', color: stat.null_pct > 10 ? '#f87171' : 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>{(100 - stat.null_pct).toFixed(0)}%</span>
        </div>
        <FillBar pct={fillPct} color={stat.null_pct > 10 ? '#f87171' : '#22d3ee'} />
      </div>

      {/* Numeric stats */}
      {stat.type_class === 'numeric' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
          {[['Min', fmt(stat.min)], ['Max', fmt(stat.max)], ['Mean', fmt(stat.mean)], ['Std', fmt(stat.std)]].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--color-bg)', borderRadius: 4, padding: '3px 6px' }}>
              <div style={{ fontSize: '0.57rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Boolean split bar */}
      {stat.type_class === 'boolean' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: '0.6rem', color: '#10b981' }}>✓ True {stat.true_pct?.toFixed(0)}%</span>
            <span style={{ fontSize: '0.6rem', color: '#f87171' }}>✗ False {(100 - (stat.true_pct ?? 0)).toFixed(0)}%</span>
          </div>
          <div style={{ height: 6, background: '#f87171', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${stat.true_pct ?? 0}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ height: '100%', background: '#10b981' }} />
          </div>
        </div>
      )}

      {/* Categorical top values */}
      {stat.type_class === 'categorical' && stat.top_values && stat.top_values.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {stat.top_values.slice(0, 3).map(({ value, count }) => {
            const pct = totalRows > 0 ? (count / totalRows) * 100 : 0
            return (
              <div key={value}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }} title={value}>{value}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                </div>
                <FillBar pct={pct} color='#a855f7' />
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 2, borderTop: '1px solid var(--color-border-dim)' }}>
        <span style={{ fontSize: '0.58rem', color: 'var(--color-text-dim)' }}>{stat.unique_count?.toLocaleString()} unique</span>
        <span style={{ fontSize: '0.58rem', color: stat.null_count > 0 ? '#fb923c' : 'var(--color-text-dim)' }}>{stat.null_count.toLocaleString()} nulls</span>
      </div>
    </motion.div>
  )
}

export default function DataExplorer() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataset, setDataset] = useState('missions')
  const [searchTerm, setSearchTerm] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [queryTime, setQueryTime] = useState(0)
  const [schemaInfo, setSchemaInfo] = useState<any[]>([])
  const [exportingParquet, setExportingParquet] = useState(false)

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

  // Stats panel state
  const [statsOpen, setStatsOpen] = useState(false)
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const fetchStats = () => {
    setStatsLoading(true)
    setStatsError(null)
    apiService.dataExplorerStats({ dataset })
      .then(r => {
        setDatasetStats(r.data)
        setStatsLoading(false)
      })
      .catch(e => {
        console.error('Stats fetch failed:', e)
        setStatsError('Failed to load statistics. Please try again.')
        setStatsLoading(false)
      })
  }

  const fetchData = () => {
    setLoading(true)
    apiService.dataExplorer({ dataset, limit: 1000 })
      .then(r => {
        const records = r.data.records || r.data.data || []
        setData(records)
        setQueryTime(r.data.query_time_ms || 14.2)
        setSchemaInfo(r.data.schema || [])
        if (records.length > 0) {
          setColumns(Object.keys(records[0]))
        } else if (r.data.schema) {
          setColumns(r.data.schema.map((s: any) => s.column))
        } else {
          setColumns([])
        }
        setCurrentPage(1)
        setLoading(false)
      })
      .catch(e => {
        console.error('Data explorer fetch failed:', e)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
    // Reset stats when dataset changes so stale data isn't shown
    setDatasetStats(null)
    setStatsError(null)
  }, [dataset])

  // Auto-load stats when the panel is first opened for a dataset
  useEffect(() => {
    if (statsOpen && !datasetStats && !statsLoading) {
      fetchStats()
    }
  }, [statsOpen, dataset])

  // Sort and Filter logic
  const filteredAndSortedData = useMemo(() => {
    let result = data

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      )
    }

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const valA = a[sortColumn]
        const valB = b[sortColumn]

        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA
        }

        const strA = String(valA).toLowerCase()
        const strB = String(valB).toLowerCase()
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA)
      })
    }

    return result
  }, [data, searchTerm, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedData.slice(start, start + pageSize)
  }, [filteredAndSortedData, currentPage, pageSize])

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  const exportCSV = () => {
    if (filteredAndSortedData.length === 0) return
    const headers = columns.join(',')
    const rows = filteredAndSortedData.map(r =>
      columns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `orbitalytics_${dataset}_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportParquet = async () => {
    try {
      setExportingParquet(true)
      const res = await apiService.exportData({ dataset, export_format: 'parquet' })
      const blob = new Blob([res.data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `orbitalytics_${dataset}.parquet`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export Parquet file:', err)
      alert('Failed to generate Parquet export. Please verify backend connectivity.')
    } finally {
      setExportingParquet(false)
    }
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge badge-accent">HDFS DATA LAKE ACCESS</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              Query Latency: {queryTime}ms • Partition: snappy.parquet / Spark SQL
            </span>
          </div>
          <h1 className="page-title">Distributed Data Explorer</h1>
          <div className="page-subtitle">Direct distributed inspection of space research, telemetry, and resource datasets</div>
        </div>

        {/* Dataset Quick Stats */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--color-surface-2)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Filtered Records: </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)' }}>{filteredAndSortedData.length}</span>
          </div>
          <div style={{ background: 'var(--color-surface-2)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Columns: </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{columns.length}</span>
          </div>
        </div>
      </div>

      {/* ── COLUMN STATISTICS PANEL ───────────────────────────────────────────── */}
      <div className="card" style={{ flexShrink: 0, marginBottom: '0.75rem', overflow: 'hidden', padding: 0 }}>
        {/* Toggle header */}
        <button
          onClick={() => setStatsOpen(prev => !prev)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', color: 'var(--color-text-primary)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={16} color="var(--color-accent)" />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Column Statistics</span>
            {datasetStats && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                {datasetStats.total_columns} columns · {datasetStats.total_rows.toLocaleString()} rows · {datasetStats.query_time_ms}ms
              </span>
            )}
            {!statsOpen && !datasetStats && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                Click to compute min, max, avg, null counts &amp; top values per column
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statsOpen && (
              <button
                onClick={e => { e.stopPropagation(); fetchStats() }}
                className="btn btn-ghost btn-sm"
                style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                title="Refresh statistics"
              >
                <RefreshCw size={11} className={statsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
            {statsOpen ? <ChevronUp size={16} color="var(--color-text-dim)" /> : <ChevronDown size={16} color="var(--color-text-dim)" />}
          </div>
        </button>

        {/* Expandable body */}
        <AnimatePresence initial={false}>
          {statsOpen && (
            <motion.div
              key="stats-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ overflow: 'hidden', borderTop: '1px solid var(--color-border)' }}
            >
              <div style={{ padding: '1rem' }}>
                {statsLoading && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--color-accent)', display: 'block' }} />
                    <div style={{ fontSize: '0.82rem' }}>Computing column statistics across full dataset…</div>
                  </div>
                )}

                {statsError && !statsLoading && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#f87171', fontSize: '0.82rem' }}>
                    {statsError}
                  </div>
                )}

                {!statsLoading && !statsError && datasetStats && (
                  <>
                    {/* Summary row */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Total Rows', value: datasetStats.total_rows.toLocaleString(), color: 'var(--color-accent)' },
                        { label: 'Columns', value: String(datasetStats.total_columns), color: 'var(--color-text-primary)' },
                        { label: 'Numeric cols', value: String(datasetStats.columns.filter(c => c.type_class === 'numeric').length), color: '#3b82f6' },
                        { label: 'Categorical cols', value: String(datasetStats.columns.filter(c => c.type_class === 'categorical').length), color: '#a855f7' },
                        { label: 'Boolean cols', value: String(datasetStats.columns.filter(c => c.type_class === 'boolean').length), color: '#10b981' },
                        { label: 'Avg nulls', value: `${(datasetStats.columns.reduce((s, c) => s + c.null_pct, 0) / datasetStats.columns.length).toFixed(1)}%`, color: '#f59e0b' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-dim)', borderRadius: 6, padding: '6px 12px' }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Column cards grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
                      {datasetStats.columns.map(stat => (
                        <ColStatCard key={stat.column} stat={stat} totalRows={datasetStats.total_rows} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
        <div className="card-header" style={{ padding: '0 0 1rem 0', margin: 0, flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Database size={18} color="var(--color-accent)" />
            <select
              className="select"
              style={{ width: 230, padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}
              value={dataset}
              onChange={e => setDataset(e.target.value)}
            >
              <option value="missions">Missions (Core Entity)</option>
              <option value="satellites">Satellites (Orbital Fleet)</option>
              <option value="resources">Resource Consumption</option>
              <option value="research">Research Activities</option>
              <option value="telemetry">Satellite Telemetry Logs</option>
              <option value="demand">Demand Analytics (Spark)</option>
              <option value="yearly">Yearly Fleet Rollup</option>
            </select>
            <button className="btn btn-secondary" onClick={fetchData} title="Reload dataset" style={{ padding: '6px 10px' }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--color-text-dim)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input"
                placeholder="Filter table rows..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                style={{ paddingLeft: 32, width: 220, fontSize: '0.85rem' }}
              />
            </div>
            <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
              <Download size={14} /> Export CSV
            </button>
            <button
              className="btn btn-primary"
              onClick={exportParquet}
              disabled={exportingParquet}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
            >
              <Download size={14} /> {exportingParquet ? 'Exporting...' : 'Parquet (Snappy)'}
            </button>
          </div>
        </div>

        {/* Tabular View */}
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-dim)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--color-accent)' }} />
              <div>Fetching partitioned data from HDFS lake...</div>
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--color-surface-2)', zIndex: 10, boxShadow: '0 1px 0 var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '8px 10px', fontSize: '0.72rem', color: 'var(--color-text-dim)', textAlign: 'center', width: 44 }}>
                    #
                  </th>
                  {columns.map(col => {
                    const isSorted = sortColumn === col
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '10px 14px',
                          fontSize: '0.74rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: isSorted ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{col.replace(/_/g, ' ')}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={11} color="var(--color-text-dim)" opacity={0.5} />
                          )}
                        </div>
                      </th>
                    )
                  })}
                  <th style={{ padding: '10px 14px', fontSize: '0.74rem', color: 'var(--color-text-dim)', textAlign: 'center', width: 60 }}>
                    INSPECT
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, i) => {
                  const rowIdx = (currentPage - 1) * pageSize + i + 1
                  return (
                    <tr
                      key={i}
                      onClick={() => setSelectedRow(row)}
                      style={{ borderBottom: '1px solid var(--color-border-dim)', cursor: 'pointer', transition: 'background 0.1s' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '8px 10px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', textAlign: 'center' }}>
                        {rowIdx}
                      </td>
                      {columns.map(col => (
                        <td key={col} style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                          {typeof row[col] === 'number' && !Number.isInteger(row[col])
                            ? row[col].toFixed(2)
                            : (typeof row[col] === 'boolean' ? (row[col] ? '✓ YES' : '✗ NO') : String(row[col] ?? '—'))}
                        </td>
                      ))}
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRow(row) }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px' }}
                          title="Inspect raw schema"
                        >
                          <Eye size={13} color="var(--color-accent)" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 2} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-dim)' }}>
                      No matching records found in selected dataset.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer & Pagination */}
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} records
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                className="select"
                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '4px 8px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '0 4px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{ padding: '4px 8px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row Technical Inspector Modal / Drawer */}
      <AnimatePresence>
        {selectedRow && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setSelectedRow(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                maxWidth: 680,
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                border: '1px solid var(--color-accent)',
                boxShadow: '0 20px 50px rgba(0, 200, 232, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileCode size={18} color="var(--color-accent)" />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>Record Technical Inspection</span>
                  <span className="badge badge-accent">{dataset.toUpperCase()}</span>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {Object.entries(selectedRow).map(([k, v]) => {
                    const schemaCol = schemaInfo.find(s => s.column === k)
                    return (
                      <div key={k} style={{ background: 'var(--color-surface-2)', padding: '0.65rem 0.85rem', borderRadius: 6, border: '1px solid var(--color-border-dim)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>{k}</span>
                          {schemaCol && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                              {schemaCol.type}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                          {String(v ?? '—')}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>
                    Raw Distributed JSON Representation
                  </div>
                  <pre style={{
                    background: '#070B14',
                    padding: '0.75rem',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-accent)',
                    overflowX: 'auto',
                    border: '1px solid var(--color-border-dim)',
                  }}>
                    {JSON.stringify(selectedRow, null, 2)}
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
