import { motion } from 'framer-motion'
import { Globe, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import OrbitalTracker from '../components/space/OrbitalTracker'
import ConjunctionRadar from '../components/space/ConjunctionRadar'
import { useTelemetrySocket } from '../services/useTelemetrySocket'

export default function SpaceOperations() {
  const { connected, latestFrame } = useTelemetrySocket()

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
              Operational Space Systems
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              SGP4 Ephemeris • Ground Station Footprints • Conjunction Assessment • Live Telemetry
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem', fontWeight: 700,
            letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0,
          }}>
            Space Operations Visualization
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: 820, lineHeight: 1.5 }}>
            Surveillance command deck for active LEO, GEO, and MEO satellite constellations, conjunction risk matrix assessment, and live sensor downlink streams.
          </p>
        </div>

        {/* 3D Cinematic Launch Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/earth-view"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 4,
              background: 'var(--color-accent)', color: '#FFFFFF',
              fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 16px rgba(255, 94, 30, 0.3)',
            }}
          >
            <Globe size={15} />
            Launch 3D Earth Globe
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Operations Quick Status Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem', marginBottom: '1.75rem',
      }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
          <div className="stat-label">TRACKED SATELLITES</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.3rem 0' }}>
            1,480 <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 400 }}>Active</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            LEO: 1,120 • GEO: 240 • MEO: 120
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
          <div className="stat-label">GROUND STATIONS ONLINE</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-success)', margin: '0.3rem 0' }}>
            16 / 16
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            100% Global Footprint Availability
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
          <div className="stat-label">CRITICAL CONJUNCTIONS</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-warning)', margin: '0.3rem 0' }}>
            2 Alerts
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Collision probability &gt; 10⁻⁴ (Within 24h)
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
          <div className="stat-label">WEBSOCKET TELEMETRY</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: connected ? 'var(--color-accent)' : 'var(--color-text-dim)', margin: '0.3rem 0' }}>
            {connected ? 'BROADCASTING' : 'OFFLINE'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            Cadence: 1.2s • Frame #{latestFrame?.frame_id || 0}
          </div>
        </div>
      </div>

      {/* Main Operations Views */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Orbital Constellation Radar Component */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <OrbitalTracker />
        </motion.div>

        {/* Space Debris & Conjunction Assessment Radar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ConjunctionRadar />
        </motion.div>

      </div>
    </div>
  )
}
