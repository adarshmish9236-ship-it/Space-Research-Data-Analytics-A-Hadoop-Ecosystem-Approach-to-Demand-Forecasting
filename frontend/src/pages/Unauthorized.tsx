/**
 * ORBITALYTICS — Unauthorized Page
 */
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldOff, ArrowLeft, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '2rem',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="card"
        style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: 400 }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <ShieldOff size={28} color="var(--color-danger)" />
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
          Access Denied
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Your role <span className="badge badge-danger">{user?.role || 'UNKNOWN'}</span> does not
          have permission to access this module.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '2rem' }}>
          Contact your Mission Commander to request elevated access.
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={14} /> Go Back
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/')}
            aria-label="Return to Mission Control"
          >
            <Home size={14} /> Mission Control
          </button>
        </div>
      </motion.div>
    </div>
  )
}
