/**
 * ORBITALYTICS — Photorealistic 3D Earth Orbital Constellation & Ground Track Radar
 * Real-time 3D WebGL NASA Blue Marble Earth, drifting atmospheric clouds, SGP4 orbital propagation,
 * ground stations network, and mission flight deck HUD.
 */
import { useEffect, useState } from 'react'
import {
  Globe, Radio, Activity, Clock,
  Crosshair, RotateCw, Sun, Moon, Cloud
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/api'
import { EarthScene } from './earth'
import type { Satellite, GroundStation, CameraPreset } from './earth'

export default function OrbitalTracker() {
  const navigate = useNavigate()
  const [satellites, setSatellites] = useState<Satellite[]>([])
  const [stations, setStations] = useState<GroundStation[]>([])
  const [selectedSat, setSelectedSat] = useState<Satellite | null>(null)
  const [showFootprints, setShowFootprints] = useState(true)
  const [showOrbits, setShowOrbits] = useState(true)
  const [showClouds, setShowClouds] = useState(true)
  const [nightMode, setNightMode] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('default')
  const [loading, setLoading] = useState(true)
  const [timeUtc, setTimeUtc] = useState(new Date().toISOString().slice(11, 19))

  const fetchOrbitalData = () => {
    Promise.all([
      apiService.orbitalSatellites(),
      apiService.groundStations(),
    ])
      .then(([satRes, stationRes]) => {
        const sats = satRes.data.satellites || []
        setSatellites(sats)
        setStations(stationRes.data.stations || [])
        if (!selectedSat && sats.length > 0) {
          setSelectedSat(sats[0])
        }
        setLoading(false)
      })
      .catch((e) => console.error('Failed to load orbital telemetry:', e))
  }

  useEffect(() => {
    fetchOrbitalData()
    const interval = setInterval(() => {
      fetchOrbitalData()
      setTimeUtc(new Date().toISOString().slice(11, 19))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // 2D Projection coordinate helpers (0-100% for CSS positioning, 0-1000 x 0-500 for SVG canvas)
  const projectX = (lon: number) => ((lon + 180) / 360) * 100
  const projectY = (lat: number) => ((90 - lat) / 180) * 100
  const svgX = (lon: number) => ((lon + 180) / 360) * 1000
  const svgY = (lat: number) => ((90 - lat) / 180) * 500

  // Standardize longitude to [-180, 180]
  const normalizeLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

  // Clamp latitude to safe bounds
  const clampLat = (lat: number) => Math.max(-85, Math.min(85, lat))

  // Angular footprint radius in degrees
  const getFootprintRadiusDeg = (sat: Satellite): number => {
    const fpKm = (sat as any).footprint_radius_km ?? sat.footprint_km
    if (fpKm && fpKm > 0) {
      return Math.min(70, fpKm / 111.32)
    }
    const alt = sat.altitude_km ?? 500
    const earthR = 6371
    const angleRad = Math.acos(earthR / (earthR + alt))
    return Math.min(70, (angleRad * 180) / Math.PI)
  }

  // Generate ground track SVG path for a satellite
  const generateGroundTrackSvgPaths = (sat: Satellite): string[] => {
    const inc = sat.inclination_deg ?? 50
    // GEO satellites have inclination near 0 and period ~1436 min - stationary ground point
    if (sat.orbit === 'GEO' || (sat.altitude_km && sat.altitude_km > 30000 && inc < 1)) {
      return []
    }

    const period = (sat.period_min ?? 95) * 60 // in seconds
    const currentLat = sat.latitude
    const currentLon = sat.longitude

    // Effective inclination for retrograde orbits
    const effectiveInc = inc > 90 ? 180 - inc : inc
    const clampedRatio = Math.max(-0.999, Math.min(0.999, currentLat / Math.max(0.1, effectiveInc)))
    let currentPhase = Math.asin(clampedRatio)

    // Check if heading southward (descending)
    const history = (sat as any).ground_track_history
    if (history && history.length > 0 && currentLat < history[0].lat) {
      currentPhase = Math.PI - currentPhase
    }

    const orbRate = 360 / period // deg/sec
    const earthRate = 360 / 86400 // deg/sec
    const netLonRate = orbRate - earthRate

    // Generate ~1.4 orbits (-0.4 in past to +1.0 in future)
    const totalDuration = period * 1.4
    const startTime = -period * 0.4
    const steps = 140
    const dt = totalDuration / steps

    const subPaths: string[] = []
    let currentSubPath: string[] = []
    let prevLon: number | null = null
    let prevY: number | null = null

    for (let s = 0; s <= steps; s++) {
      const t = startTime + s * dt
      const phase = currentPhase + (2 * Math.PI * t) / period
      const lat = clampLat(effectiveInc * Math.sin(phase))
      const lon = normalizeLon(currentLon + netLonRate * t)

      const x = svgX(lon)
      const y = svgY(lat)

      if (prevLon !== null && prevY !== null && Math.abs(lon - prevLon) > 180) {
        // Seam boundary crossing (+180 <-> -180)
        const isEastbound = lon < prevLon
        const fraction = isEastbound
          ? (180 - prevLon) / (180 - prevLon + (lon - (-180)))
          : (-180 - prevLon) / (-180 - prevLon + (lon - 180))
        const safeFrac = Math.max(0, Math.min(1, isFinite(fraction) ? fraction : 0.5))
        const borderY = prevY + safeFrac * (y - prevY)

        if (isEastbound) {
          currentSubPath.push(`L 1000 ${borderY.toFixed(1)}`)
          if (currentSubPath.length > 1) {
            subPaths.push(currentSubPath.join(' '))
          }
          currentSubPath = [`M 0 ${borderY.toFixed(1)}`, `L ${x.toFixed(1)} ${y.toFixed(1)}`]
        } else {
          currentSubPath.push(`L 0 ${borderY.toFixed(1)}`)
          if (currentSubPath.length > 1) {
            subPaths.push(currentSubPath.join(' '))
          }
          currentSubPath = [`M 1000 ${borderY.toFixed(1)}`, `L ${x.toFixed(1)} ${y.toFixed(1)}`]
        }
      } else {
        if (currentSubPath.length === 0) {
          currentSubPath.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`)
        } else {
          currentSubPath.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`)
        }
      }

      prevLon = lon
      prevY = y
    }

    if (currentSubPath.length > 1) {
      subPaths.push(currentSubPath.join(' '))
    }

    return subPaths
  }

  return (
    <div className="card" style={{ padding: '1.25rem', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 200, 232, 0.08) 0%, var(--color-surface) 75%)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="var(--color-accent)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.04em', margin: 0 }}>
              Live 3D Orbital Constellation & Ground Track Radar
            </h2>
            <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
              {loading ? '● SYNCING EPHEMERIS...' : '● NASA 3D EARTH VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: 2 }}>
            NASA Blue Marble Satellite Imagery • Tropospheric Cloud Dynamics • UTC Clock: <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{timeUtc}Z</span>
          </div>
        </div>

        {/* View Controls & 3D Tools */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 3D vs 2D Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 2, borderRadius: 6, border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setViewMode('3d')}
              className={`btn btn-xs ${viewMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.72rem', padding: '3px 9px' }}
            >
              3D Earth
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`btn btn-xs ${viewMode === '2d' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.72rem', padding: '3px 9px' }}
            >
              2D Tactical
            </button>
          </div>

          {viewMode === '3d' && (
            <>
              {/* Day / Night City Lights Toggle */}
              <button
                onClick={() => setNightMode(!nightMode)}
                className={`btn btn-sm ${nightMode ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                title="Toggle Daytime / Night City Lights Map"
              >
                {nightMode ? <Moon size={12} /> : <Sun size={12} />} {nightMode ? 'Night Lights' : 'Daylight'}
              </button>

              {/* Cloud Layer Toggle */}
              <button
                onClick={() => setShowClouds(!showClouds)}
                className={`btn btn-sm ${showClouds ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                title="Toggle Atmospheric Cloud Layer"
              >
                <Cloud size={12} /> Clouds: {showClouds ? 'ON' : 'OFF'}
              </button>

              {/* Earth Auto-Rotation Toggle */}
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`btn btn-sm ${autoRotate ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                title="Toggle Earth Axis Rotation"
              >
                <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} /> {autoRotate ? 'Spinning' : 'Locked'}
              </button>

              <button
                onClick={() => setCameraPreset('focus')}
                className={`btn btn-sm ${cameraPreset === 'focus' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                title="Center Camera on Target Satellite"
              >
                <Crosshair size={12} /> Focus Target
              </button>
            </>
          )}

          <button
            onClick={() => setShowFootprints(!showFootprints)}
            className={`btn btn-sm ${showFootprints ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.72rem', padding: '4px 8px' }}
          >
            <Radio size={12} /> Footprints: {showFootprints ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowOrbits(!showOrbits)}
            className={`btn btn-sm ${showOrbits ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.72rem', padding: '4px 8px' }}
          >
            <Activity size={12} /> Orbits: {showOrbits ? 'ON' : 'OFF'}
          </button>

          {/* Dedicated Earth 3D View Section Button */}
          <button
            onClick={() => navigate('/earth-view')}
            className="btn btn-sm"
            style={{
              fontSize: '0.72rem',
              padding: '4px 10px',
              background: 'linear-gradient(135deg, #00C8E8 0%, #0077B6 100%)',
              border: '1px solid #00C8E8',
              color: '#FFFFFF',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 0 14px rgba(0, 200, 232, 0.45)',
              cursor: 'pointer',
              borderRadius: 6,
            }}
            title="Open Full-Screen Cinematic Earth 3D View"
          >
            <Globe size={13} /> Earth 3D View
          </button>
        </div>
      </div>

      {/* Main Radar Display Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '1.25rem', alignItems: 'start' }}>
        {/* Radar View Container */}
        {viewMode === '3d' ? (
          <div style={{
            position: 'relative',
            width: '100%',
            height: 420,
            background: '#020409',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9)',
          }}>
            {/* Photorealistic 3D Earth Engine */}
            <EarthScene
              satellites={satellites}
              groundStations={stations}
              selectedSatellite={selectedSat}
              settings={{
                daylight: !nightMode,
                clouds: showClouds,
                autoRotate: autoRotate,
                showFootprints: showFootprints,
                showOrbits: showOrbits,
              }}
              cameraPreset={cameraPreset}
              onSelectSatellite={(sat) => {
                setSelectedSat(sat)
                setCameraPreset('focus')
              }}
            />

            {/* Quick Camera Presets Overlay */}
            <div style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              gap: 4,
              background: 'rgba(5, 9, 20, 0.75)',
              padding: 4,
              borderRadius: 6,
              border: '1px solid var(--color-border-dim)',
              backdropFilter: 'blur(4px)',
              zIndex: 10,
            }}>
              <button
                onClick={() => setCameraPreset('default')}
                className={`btn btn-xs ${cameraPreset === 'default' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.65rem' }}
              >
                Default 3D
              </button>
              <button
                onClick={() => setCameraPreset('north_pole')}
                className={`btn btn-xs ${cameraPreset === 'north_pole' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.65rem' }}
              >
                Polar View
              </button>
              <button
                onClick={() => setCameraPreset('equatorial')}
                className={`btn btn-xs ${cameraPreset === 'equatorial' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.65rem' }}
              >
                Equatorial
              </button>
            </div>

            {/* Interactive 3D Control Hints */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 10,
              fontSize: '0.65rem',
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(5, 9, 20, 0.75)',
              padding: '2px 8px',
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 10,
            }}>
              Left Click + Drag: Rotate 3D Earth • Scroll: Zoom In/Out • Click Spacecraft: Select Target
            </div>
          </div>
        ) : (
          /* 2D Tactical World Map Radar View */
          <div style={{
            position: 'relative',
            width: '100%',
            height: 420,
            background: '#070B14',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
          }}>
            {/* Grid lines */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}>
              {[-60, -30, 0, 30, 60].map((lat) => (
                <line key={`lat-${lat}`} x1="0%" y1={`${projectY(lat)}%`} x2="100%" y2={`${projectY(lat)}%`} stroke="var(--color-accent)" strokeDasharray="4 4" />
              ))}
              {[-120, -60, 0, 60, 120].map((lon) => (
                <line key={`lon-${lon}`} x1={`${projectX(lon)}%`} y1="0%" x2={`${projectX(lon)}%`} y2="100%" stroke="var(--color-accent)" strokeDasharray="4 4" />
              ))}
              <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="var(--color-accent)" strokeWidth="1" opacity="0.4" />
              <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="var(--color-accent)" strokeWidth="1" opacity="0.4" />
            </svg>

            {/* Continents Outline */}
            <svg viewBox="0 0 1000 500" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', fill: 'rgba(255, 255, 255, 0.04)', stroke: 'rgba(0, 200, 232, 0.18)', strokeWidth: 1, pointerEvents: 'none' }}>
              <path d="M 150,80 Q 220,70 260,110 Q 300,160 270,220 Q 230,230 200,200 Q 180,180 150,80 Z" />
              <path d="M 230,250 Q 310,270 330,340 Q 300,430 260,460 Q 230,380 230,300 Z" />
              <path d="M 460,70 Q 550,80 540,140 Q 480,160 450,120 Z" />
              <path d="M 450,170 Q 560,180 570,280 Q 540,380 490,410 Q 440,320 420,220 Z" />
              <path d="M 560,80 Q 750,70 820,130 Q 800,240 680,260 Q 580,200 560,120 Z" />
              <path d="M 750,310 Q 860,320 860,400 Q 770,420 740,360 Z" />
            </svg>

            {/* Tactical 2D Orbits & Footprints Vector Layer */}
            <svg
              viewBox="0 0 1000 500"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <defs>
                <filter id="orbit-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 1. Ground Station Horizon Footprints (when Footprints ON) */}
              {showFootprints && stations.map((st) => {
                const cx = svgX(st.lon)
                const cy = svgY(st.lat)
                const rDeg = 15 // ~1650 km ground station reception radius
                const ry = (rDeg / 180) * 500
                const cosLat = Math.max(0.2, Math.cos((st.lat * Math.PI) / 180))
                const rx = (rDeg / (360 * cosLat)) * 1000

                return (
                  <g key={`gs-footprint-${st.id}`}>
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill="#F59E0B"
                      fillOpacity={0.04}
                      stroke="#F59E0B"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      strokeOpacity={0.35}
                    />
                  </g>
                )
              })}

              {/* 2. Orbital Ground Tracks (when Orbits ON) */}
              {showOrbits && satellites.map((sat) => {
                const isSelected = selectedSat?.id === sat.id
                const paths = generateGroundTrackSvgPaths(sat)
                if (paths.length === 0) return null

                return (
                  <g
                    key={`orbit-${sat.id}`}
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={() => setSelectedSat(sat)}
                  >
                    {paths.map((p, i) => (
                      <path
                        key={`path-${sat.id}-${i}`}
                        d={p}
                        fill="none"
                        stroke={sat.color}
                        strokeWidth={isSelected ? 2.4 : 1.2}
                        strokeDasharray={isSelected ? undefined : '4 3'}
                        strokeOpacity={isSelected ? 0.95 : 0.38}
                        filter={isSelected ? 'url(#orbit-glow)' : undefined}
                      />
                    ))}
                  </g>
                )
              })}

              {/* 3. Satellite Line-of-Sight Coverage Footprints (when Footprints ON) */}
              {showFootprints && satellites.map((sat) => {
                const isSelected = selectedSat?.id === sat.id
                const rDeg = getFootprintRadiusDeg(sat)
                const cx = svgX(sat.longitude)
                const cy = svgY(sat.latitude)
                const ry = (rDeg / 180) * 500
                const cosLat = Math.max(0.18, Math.cos((sat.latitude * Math.PI) / 180))
                const rx = (rDeg / (360 * cosLat)) * 1000

                const needWrapLeft = cx - rx < 0
                const needWrapRight = cx + rx > 1000

                return (
                  <g
                    key={`footprint-${sat.id}`}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={() => setSelectedSat(sat)}
                  >
                    {/* Primary Footprint Ellipse */}
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill={sat.color}
                      fillOpacity={isSelected ? 0.16 : 0.06}
                      stroke={sat.color}
                      strokeWidth={isSelected ? 1.8 : 1}
                      strokeDasharray={isSelected ? '4 3' : '3 3'}
                      strokeOpacity={isSelected ? 0.85 : 0.35}
                    />

                    {/* Left edge wrap for Pacific / antimeridian seam */}
                    {needWrapLeft && (
                      <ellipse
                        cx={cx + 1000}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        fill={sat.color}
                        fillOpacity={isSelected ? 0.16 : 0.06}
                        stroke={sat.color}
                        strokeWidth={isSelected ? 1.8 : 1}
                        strokeDasharray={isSelected ? '4 3' : '3 3'}
                        strokeOpacity={isSelected ? 0.85 : 0.35}
                      />
                    )}

                    {/* Right edge wrap for Pacific / antimeridian seam */}
                    {needWrapRight && (
                      <ellipse
                        cx={cx - 1000}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        fill={sat.color}
                        fillOpacity={isSelected ? 0.16 : 0.06}
                        stroke={sat.color}
                        strokeWidth={isSelected ? 1.8 : 1}
                        strokeDasharray={isSelected ? '4 3' : '3 3'}
                        strokeOpacity={isSelected ? 0.85 : 0.35}
                      />
                    )}

                    {/* Selected Satellite Sub-satellite Nadir Reticle Crosshair */}
                    {isSelected && (
                      <g stroke={sat.color} strokeWidth={1.2} opacity={0.85}>
                        <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} />
                        <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} />
                        <circle cx={cx} cy={cy} r={4} fill="none" />
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Ground Station Markers */}
            {stations.map((st) => (
              <div
                key={st.id}
                title={`${st.name} (${st.country})`}
                style={{
                  position: 'absolute',
                  left: `${projectX(st.lon)}%`,
                  top: `${projectY(st.lat)}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }} />
              </div>
            ))}

            {/* Satellites Markers */}
            {satellites.map((sat) => {
              const isSelected = selectedSat?.id === sat.id
              return (
                <div
                  key={sat.id}
                  onClick={() => setSelectedSat(sat)}
                  style={{
                    position: 'absolute',
                    left: `${projectX(sat.longitude)}%`,
                    top: `${projectY(sat.latitude)}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 30 : 20,
                  }}
                >
                  <div style={{
                    width: isSelected ? 16 : 12,
                    height: isSelected ? 16 : 12,
                    borderRadius: '50%',
                    background: sat.color,
                    boxShadow: `0 0 ${isSelected ? 16 : 8}px ${sat.color}`,
                    border: isSelected ? '2px solid #fff' : 'none',
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.62rem',
                    color: isSelected ? '#fff' : sat.color,
                    background: 'rgba(7, 11, 20, 0.85)',
                    padding: '1px 5px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {sat.name.split(' ')[0]}
                  </div>
                </div>
              )
            })}

            {/* 2D Tactical HUD Status Bar */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 10,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: '0.65rem',
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(5, 9, 20, 0.85)',
              padding: '3px 9px',
              borderRadius: 4,
              border: '1px solid var(--color-border-dim)',
              pointerEvents: 'none',
              zIndex: 25,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>2D TACTICAL PROJECTION</span>
              <span>•</span>
              <span style={{ color: showOrbits ? 'var(--color-accent)' : 'var(--color-text-dim)' }}>
                ORBITS: {showOrbits ? 'ACTIVE' : 'OFF'}
              </span>
              <span>•</span>
              <span style={{ color: showFootprints ? 'var(--color-accent)' : 'var(--color-text-dim)' }}>
                FOOTPRINTS: {showFootprints ? 'ACTIVE' : 'OFF'}
              </span>
              {selectedSat && (
                <>
                  <span>•</span>
                  <span style={{ color: selectedSat.color, fontWeight: 600 }}>
                    TARGET: {selectedSat.name.split(' ')[0]} ({selectedSat.latitude > 0 ? `${selectedSat.latitude.toFixed(1)}°N` : `${Math.abs(selectedSat.latitude).toFixed(1)}°S`}, {selectedSat.longitude > 0 ? `${selectedSat.longitude.toFixed(1)}°E` : `${Math.abs(selectedSat.longitude).toFixed(1)}°W`})
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Flight HUD & Telemetry Inspection Deck */}
        {selectedSat ? (
          <div style={{
            background: 'var(--color-surface-2)',
            border: `1px solid ${selectedSat.color}40`,
            borderRadius: 8,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: `0 4px 20px ${selectedSat.color}15`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: selectedSat.color, fontWeight: 700, letterSpacing: '0.08em' }}>
                  ACTIVE TARGET • {selectedSat.orbit}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {selectedSat.name}
                </div>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                NORAD {selectedSat.id}
              </span>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              <strong>Operator:</strong> {selectedSat.operator}<br />
              <strong>Mission:</strong> {selectedSat.purpose}
            </div>

            {/* Grid Telemetry Values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'var(--color-bg)', padding: '0.5rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>Altitude</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedSat.altitude_km?.toLocaleString()} km
                </div>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '0.5rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>Orbital Velocity</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                  {selectedSat.velocity_kms} km/s
                </div>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '0.5rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>Sub-Sat Latitude</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {selectedSat.latitude > 0 ? `${selectedSat.latitude.toFixed(2)}° N` : `${Math.abs(selectedSat.latitude).toFixed(2)}° S`}
                </div>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '0.5rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>Sub-Sat Longitude</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {selectedSat.longitude > 0 ? `${selectedSat.longitude.toFixed(2)}° E` : `${Math.abs(selectedSat.longitude).toFixed(2)}° W`}
                </div>
              </div>
            </div>

            {/* Next Pass Prediction */}
            <div style={{
              background: 'rgba(0, 200, 232, 0.06)',
              border: '1px solid rgba(0, 200, 232, 0.2)',
              borderRadius: 6,
              padding: '0.65rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                <Clock size={12} /> Ground Station Acquisition
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: 4 }}>
                {selectedSat.next_pass?.ground_station}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-dim)', marginTop: 3 }}>
                <span>AOS in: {selectedSat.next_pass?.minutes_remaining} min</span>
                <span>Max Elevation: {selectedSat.next_pass?.max_elevation_deg}°</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
            Click a satellite icon on the radar to inspect its flight telemetry.
          </div>
        )}
      </div>

      {/* Satellite Switcher Carousel Ribbon */}
      <div style={{ display: 'flex', gap: 6, marginTop: '1rem', overflowX: 'auto', paddingBottom: 4 }}>
        {satellites.map((sat) => {
          const isSelected = selectedSat?.id === sat.id
          return (
            <button
              key={sat.id}
              onClick={() => {
                setSelectedSat(sat)
                if (viewMode === '3d') {
                  setCameraPreset('focus')
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 20,
                background: isSelected ? `${sat.color}25` : 'var(--color-surface-2)',
                border: `1px solid ${isSelected ? sat.color : 'var(--color-border)'}`,
                color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: sat.color, boxShadow: isSelected ? `0 0 8px ${sat.color}` : 'none' }} />
              <span style={{ fontWeight: isSelected ? 700 : 400 }}>{sat.name}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>({sat.orbit})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
