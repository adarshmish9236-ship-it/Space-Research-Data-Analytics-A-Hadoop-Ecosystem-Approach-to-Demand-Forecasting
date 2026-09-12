/**
 * ORBITALYTICS — 3D Earth & Orbital Visualization Types
 * Standard aerospace definitions for satellites, orbits, ground stations, and scene settings.
 */

export interface GroundStation {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  status: string
  uplink_band: string
  elevation_limit_deg: number
}

export interface SatelliteTrajectoryPoint {
  lat: number
  lon: number
}

export interface GroundStationPass {
  ground_station: string
  country: string
  minutes_remaining: number
  max_elevation_deg: number
  link_margin_db: number
  doppler_shift_khz: number
}

export interface Satellite {
  id: string
  name: string
  orbit: 'LEO' | 'LEO-Polar' | 'MEO' | 'GEO' | string
  altitude_km: number
  velocity_kms: number
  inclination_deg: number
  period_min: number
  operator: string
  purpose: string
  color: string
  latitude: number
  longitude: number
  footprint_km: number
  trajectory_points?: SatelliteTrajectoryPoint[]
  next_pass?: GroundStationPass
}

export type CameraPreset = 'default' | 'north_pole' | 'equatorial' | 'focus'

export interface EarthVisualizationSettings {
  daylight: boolean
  clouds: boolean
  autoRotate: boolean
  showFootprints: boolean
  showOrbits: boolean
}
