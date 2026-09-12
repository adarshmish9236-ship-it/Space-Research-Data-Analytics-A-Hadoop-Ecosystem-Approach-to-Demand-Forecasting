/**
 * ORBITALYTICS — Real-Time Telemetry WebSocket Hook
 * Provides high-frequency satellite telemetry frames and connection status.
 */
import { useState, useEffect, useRef } from 'react'

export interface TelemetryFrame {
  type: string
  frame_id: number
  timestamp: string
  satellite: {
    id: string
    name: string
    orbit: string
    apogee_km: number
    inclination_deg: number
  }
  metrics: {
    temperature_c: number
    power_usage_w: number
    battery_level_pct: number
    signal_strength_dbm: number
    data_rate_mbps: number
    storage_utilization_pct: number
    sunlight_fraction: number
  }
  status: 'NOMINAL' | 'ANOMALY_DETECTED'
  anomaly?: {
    subsystem: string
    severity: string
    message: string
  } | null
  cluster_metrics: {
    cpu_load_pct: number
    memory_used_gb: number
    active_spark_executors: number
    hdfs_iops: number
  }
}

export function useTelemetrySocket() {
  const [connected, setConnected] = useState(false)
  const [latestFrame, setLatestFrame] = useState<TelemetryFrame | null>(null)
  const [history, setHistory] = useState<TelemetryFrame[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let isMounted = true

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws/telemetry`

      try {
        const ws = new WebSocket(wsUrl)
        socketRef.current = ws

        ws.onopen = () => {
          if (!isMounted) return
          setConnected(true)
          console.log('[Telemetry WS] Connected to live satellite telemetry stream')
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const frame = JSON.parse(event.data) as TelemetryFrame
            setLatestFrame(frame)
            setHistory((prev) => {
              const updated = [...prev, frame]
              return updated.length > 25 ? updated.slice(-25) : updated
            })
          } catch (e) {
            console.error('[Telemetry WS] Message parsing failed:', e)
          }
        }

        ws.onclose = () => {
          if (!isMounted) return
          setConnected(false)
          console.log('[Telemetry WS] Disconnected. Reconnecting in 3 seconds...')
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }

        ws.onerror = (err) => {
          console.warn('[Telemetry WS] Socket error:', err)
          ws.close()
        }
      } catch (err) {
        console.warn('[Telemetry WS] Connection initiation error:', err)
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (socketRef.current) socketRef.current.close()
    }
  }, [])

  return { connected, latestFrame, history }
}
