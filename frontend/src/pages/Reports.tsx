import { useEffect, useState } from 'react'
import {
  FileText, Download, Printer, ShieldAlert, CheckCircle2,
  Cpu, TrendingUp, AlertTriangle, RefreshCw
} from 'lucide-react'
import { apiService } from '../services/api'
import { motion } from 'framer-motion'

export default function Reports() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const fetchReport = () => {
    setLoading(true)
    setError(null)
    apiService.reportsExecutive()
      .then(res => {
        setReport(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch executive report:', err)
        setError('Failed to generate executive report. Please verify backend connectivity.')
        setLoading(false)
      })
  }

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true)
      const res = await apiService.exportPdf()
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `orbitalytics_executive_briefing_${new Date().toISOString().slice(0, 10)}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export PDF:', err)
      alert('Failed to generate PDF briefing. Please verify backend connectivity.')
    } finally {
      setExportingPdf(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: 48, width: 320 }} />
          <div className="skeleton" style={{ height: 200 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="page-content">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <AlertTriangle size={36} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Report Generation Failed</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchReport}>Retry Generation</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <FileText size={20} color="var(--color-accent)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              {report.report_id} • {report.generated_at}
            </span>
          </div>
          <h1 className="page-title">{report.title}</h1>
          <div className="page-subtitle">{report.subtitle}</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
            <CheckCircle2 size={13} style={{ marginRight: 4 }} /> {report.status}
          </div>
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} /> Print
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {exportingPdf ? (
              <>
                <RefreshCw size={15} className="animate-spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download size={15} /> Export Audit PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-accent)' }}>
        <div className="card-header">
          <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            Executive Flight & Infrastructure Briefing
          </div>
        </div>
        <p style={{ lineHeight: 1.7, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
          {report.executive_summary}
        </p>
      </motion.div>

      {/* KPI Matrix */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Evaluated Missions</div>
          <div className="kpi-value" style={{ color: 'var(--color-accent)' }}>
            {report.kpis.total_missions_evaluated.toLocaleString()}
          </div>
          <div className="kpi-subtext">HDFS Master Ingestion</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Overall Success Rate</div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>
            {report.kpis.overall_success_rate_pct}%
          </div>
          <div className="kpi-subtext">Historical Fleet Average</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">HDFS Data Lake Storage</div>
          <div className="kpi-value">
            {report.kpis.hdfs_storage_used_tb} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>TB</span>
          </div>
          <div className="kpi-subtext">{report.kpis.active_datanodes} Active DataNodes</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Telemetry Anomalies</div>
          <div className="kpi-value" style={{ color: report.kpis.active_anomalies > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {report.kpis.active_anomalies}
          </div>
          <div className="kpi-subtext">Statistical Outliers Flagged</div>
        </div>
      </div>

      {/* Two Column Grid: Capacity Risks & Distributed Cluster Health */}
      <div className="two-col-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Top Demand Drivers & Capacity Risks */}
        <motion.div className="card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-header">
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--color-info)" /> Resource Trajectory & Capacity Risks
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {report.top_demand_drivers.map((d: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.resource}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Forecast Trajectory: {d.forecast_growth}</div>
                </div>
                <div className={`badge ${d.status.includes('ELEVATED') ? 'badge-danger' : (d.status.includes('MODERATE') ? 'badge-warning' : 'badge-success')}`}>
                  {d.status}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Distributed Big Data Infrastructure State */}
        <motion.div className="card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="card-header">
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} color="var(--color-accent)" /> Hadoop & Spark Architecture Health
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>HDFS Utilization</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{report.infrastructure_state.hdfs_utilization_pct}%</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>YARN VCore Allocation</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{report.infrastructure_state.yarn_allocated_vcores} / {report.infrastructure_state.yarn_total_vcores}</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: 8, gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Pipeline Data Integrity</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <CheckCircle2 size={15} /> {report.infrastructure_state.data_pipeline_health}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decision Engine Actionable Recommendations */}
      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-header">
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} color="var(--color-warning)" /> Decision Support & Strategic Recommendations
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {report.decision_recommendations.map((rec: any, idx: number) => (
            <div key={idx} style={{ padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                  {rec.domain} — {rec.action}
                </div>
                <div className={`badge ${rec.priority === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                  {rec.priority} PRIORITY
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--color-text-dim)' }}>Rationale: </strong> {rec.rationale}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
