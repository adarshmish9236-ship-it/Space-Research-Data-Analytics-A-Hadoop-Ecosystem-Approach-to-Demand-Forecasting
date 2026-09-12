import * as THREE from 'three'
import type { Satellite, GroundStation } from './types'

/**
 * Spherical coordinate conversion: (lat, lon) on Earth radius R -> 3D Vector
 * Geographic alignment with NASA Blue Marble equirectangular texture:
 * Lon 0 = +X, Lat +90 = +Y, Lon +90 = -Z
 */
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(x, y, z)
}

/**
 * Calculate the true 3D orbital position vector given inclination, RAAN, altitude, and orbital angle
 */
export function calculateOrbitalPosition(
  inclinationDeg: number,
  raanDeg: number,
  radius: number,
  angleRad: number
): THREE.Vector3 {
  const incRad = inclinationDeg * (Math.PI / 180)
  const raanRad = raanDeg * (Math.PI / 180)

  // Orthonormal basis vectors spanning the orbital plane
  const u = new THREE.Vector3(Math.cos(raanRad), 0, Math.sin(raanRad))
  const v = new THREE.Vector3(
    -Math.sin(raanRad) * Math.cos(incRad),
    Math.sin(incRad),
    Math.cos(raanRad) * Math.cos(incRad)
  )

  const pos = new THREE.Vector3()
    .addScaledVector(u, Math.cos(angleRad) * radius)
    .addScaledVector(v, Math.sin(angleRad) * radius)

  return pos
}

export class SatelliteLayer {
  public group: THREE.Group
  public groundStationsGroup: THREE.Group
  private earthRadius: number
  private satellites: Satellite[] = []

  // Meshes & Lines Cache
  private satMeshes: Map<string, THREE.Group> = new Map()
  private orbitLines: Map<string, THREE.Line> = new Map()
  private nadirLines: Map<string, THREE.Line> = new Map()
  private footprintMeshes: Map<string, THREE.Mesh> = new Map()
  private clickTargets: THREE.Mesh[] = []

  // Shared Geometries & Materials for high performance
  private busGeo = new THREE.BoxGeometry(0.36, 0.26, 0.22)
  private panelGeo = new THREE.BoxGeometry(1.4, 0.04, 0.38)
  private dishGeo = new THREE.ConeGeometry(0.16, 0.12, 12)
  private reticleGeo = new THREE.RingGeometry(0.85, 1.05, 32)
  private stationDishGeo = new THREE.SphereGeometry(0.18, 16, 16)
  private stationRingGeo = new THREE.RingGeometry(0.35, 0.5, 24)

  private satBusMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.2,
  })
  private panelMat = new THREE.MeshStandardMaterial({
    color: 0x0a2239,
    metalness: 0.8,
    roughness: 0.25,
    emissive: 0x041324,
    emissiveIntensity: 0.3,
  })
  private stationMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  private stationRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  })

  // Settings
  private showFootprints = true
  private showOrbits = true

  constructor(earthRadius = 10.0) {
    this.earthRadius = earthRadius
    this.group = new THREE.Group()
    this.groundStationsGroup = new THREE.Group()
    this.group.add(this.groundStationsGroup)
  }

  public setGroundStations(stations: GroundStation[]) {
    this.groundStationsGroup.clear()

    stations.forEach((st) => {
      const pos = latLonToVector3(st.lat, st.lon, this.earthRadius + 0.05)
      const stGroup = new THREE.Group()
      stGroup.position.copy(pos)

      // Station telemetry dome
      const dish = new THREE.Mesh(this.stationDishGeo, this.stationMat)
      stGroup.add(dish)

      // Ground reception horizon ring
      const ring = new THREE.Mesh(this.stationRingGeo, this.stationRingMat)
      ring.lookAt(new THREE.Vector3(0, 0, 0))
      stGroup.add(ring)

      this.groundStationsGroup.add(stGroup)
    })
  }

  public setSatellites(
    satellites: Satellite[],
    selectedSatId: string | null,
    showFootprints = true,
    showOrbits = true
  ) {
    this.satellites = satellites
    this.showFootprints = showFootprints
    this.showOrbits = showOrbits

    // Clean up existing satellite graphics
    this.satMeshes.forEach((m) => this.group.remove(m))
    this.satMeshes.clear()
    this.orbitLines.forEach((l) => this.group.remove(l))
    this.orbitLines.clear()
    this.nadirLines.forEach((l) => this.group.remove(l))
    this.nadirLines.clear()
    this.footprintMeshes.forEach((m) => this.group.remove(m))
    this.footprintMeshes.clear()
    this.clickTargets = []

    satellites.forEach((sat, index) => {
      const isSelected = sat.id === selectedSatId
      const color = new THREE.Color(sat.color || '#00C8E8')

      // Realistic altitude scaling: LEO (400-800km) ~ 10.8-11.4, MEO (20,200km) ~ 17.5, GEO (35,786km) ~ 23.5
      const altRatio = Math.min(1.0, (sat.altitude_km || 500) / 36000)
      const orbitalRadius = this.earthRadius + 0.9 + altRatio * 13.0

      // Distinct RAAN for distinct 3D orbital planes
      const raanDeg = (index * 68.5) % 360

      // Create Genuine 3D Keplerian Orbital Trajectory
      if (this.showOrbits) {
        const segments = 128
        const orbitPoints: THREE.Vector3[] = []
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2
          orbitPoints.push(calculateOrbitalPosition(sat.inclination_deg, raanDeg, orbitalRadius, angle))
        }

        const pathGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints)
        const pathMat = new THREE.LineBasicMaterial({
          color: color.getHex(),
          transparent: true,
          opacity: isSelected ? 0.92 : 0.22,
        })
        const orbitLine = new THREE.Line(pathGeo, pathMat)
        this.group.add(orbitLine)
        this.orbitLines.set(sat.id, orbitLine)
      }

      // Initial Satellite Position (from sub-satellite coordinates)
      const satPos = latLonToVector3(sat.latitude, sat.longitude, orbitalRadius)
      const subSatPos = latLonToVector3(sat.latitude, sat.longitude, this.earthRadius + 0.05)

      // Aerospace Spacecraft Assembly
      const satGroup = new THREE.Group()
      satGroup.position.copy(satPos)
      satGroup.userData = { satelliteId: sat.id, sat }

      // Central avionics bus
      const bus = new THREE.Mesh(this.busGeo, this.satBusMat)
      satGroup.add(bus)

      // Photovoltaic solar array wings
      const solarPanel = new THREE.Mesh(this.panelGeo, this.panelMat)
      satGroup.add(solarPanel)

      // Communication dish
      const dish = new THREE.Mesh(this.dishGeo, this.satBusMat)
      dish.rotation.x = Math.PI / 2
      dish.position.z = 0.16
      satGroup.add(dish)

      // Telemetry beacon
      const beaconGeo = new THREE.SphereGeometry(isSelected ? 0.28 : 0.18, 12, 12)
      const beaconMat = new THREE.MeshBasicMaterial({ color: color.getHex() })
      const beacon = new THREE.Mesh(beaconGeo, beaconMat)
      satGroup.add(beacon)

      // Selected Target Reticle
      if (isSelected) {
        const reticleMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
        const reticle = new THREE.Mesh(this.reticleGeo, reticleMat)
        reticle.lookAt(satPos.clone().multiplyScalar(2))
        satGroup.add(reticle)
      }

      // Invisible Click & Hover Hitbox for Smooth Raycasting
      const hitGeo = new THREE.SphereGeometry(1.2, 8, 8)
      const hitMat = new THREE.MeshBasicMaterial({ visible: false })
      const hitMesh = new THREE.Mesh(hitGeo, hitMat)
      hitMesh.userData = { satelliteId: sat.id, sat }
      satGroup.add(hitMesh)
      this.clickTargets.push(hitMesh)

      this.group.add(satGroup)
      this.satMeshes.set(sat.id, satGroup)

      // Nadir line down to Earth surface
      if (this.showFootprints) {
        const nadirGeo = new THREE.BufferGeometry().setFromPoints([subSatPos, satPos])
        const nadirMat = new THREE.LineDashedMaterial({
          color: color.getHex(),
          dashSize: 0.35,
          gapSize: 0.2,
          transparent: true,
          opacity: 0.45,
        })
        const nadirLine = new THREE.Line(nadirGeo, nadirMat)
        nadirLine.computeLineDistances()
        this.group.add(nadirLine)
        this.nadirLines.set(sat.id, nadirLine)

        // Line-of-sight Communication Footprint on Earth Surface
        const fpRadius = Math.min(3.8, 1.2 + altRatio * 3.2)
        const fpGeo = new THREE.RingGeometry(fpRadius * 0.7, fpRadius, 32)
        const fpMat = new THREE.MeshBasicMaterial({
          color: color.getHex(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.3 : 0.12,
        })
        const fpMesh = new THREE.Mesh(fpGeo, fpMat)
        fpMesh.position.copy(subSatPos)
        fpMesh.lookAt(new THREE.Vector3(0, 0, 0))
        this.group.add(fpMesh)
        this.footprintMeshes.set(sat.id, fpMesh)
      }
    })
  }

  /**
   * Update real-time satellite positions and continuous orbital motion
   */
  public update(elapsedTime: number) {
    this.satellites.forEach((sat, index) => {
      const satGroup = this.satMeshes.get(sat.id)
      if (!satGroup) return

      const altRatio = Math.min(1.0, (sat.altitude_km || 500) / 36000)
      const orbitalRadius = this.earthRadius + 0.9 + altRatio * 13.0
      const raanDeg = (index * 68.5) % 360

      // Period-scaled continuous motion
      const periodSec = Math.max(90, (sat.period_min || 95) * 60)
      // Simulation time speed multiplier: 1 second realtime = ~60 seconds orbital motion
      const simRate = 60.0
      const angle = ((elapsedTime * simRate) / periodSec) * Math.PI * 2

      const newPos = calculateOrbitalPosition(sat.inclination_deg, raanDeg, orbitalRadius, angle)
      satGroup.position.copy(newPos)

      // Align satellite solar arrays to face outward
      satGroup.lookAt(newPos.clone().multiplyScalar(1.2))

      // Update nadir line & ground footprint
      const subSatPos = newPos.clone().normalize().multiplyScalar(this.earthRadius + 0.05)

      const nadirLine = this.nadirLines.get(sat.id)
      if (nadirLine) {
        const positions = nadirLine.geometry.attributes.position as THREE.BufferAttribute
        positions.setXYZ(0, subSatPos.x, subSatPos.y, subSatPos.z)
        positions.setXYZ(1, newPos.x, newPos.y, newPos.z)
        positions.needsUpdate = true
        nadirLine.computeLineDistances()
      }

      const fpMesh = this.footprintMeshes.get(sat.id)
      if (fpMesh) {
        fpMesh.position.copy(subSatPos)
        fpMesh.lookAt(new THREE.Vector3(0, 0, 0))
      }
    })
  }

  public getClickTargets(): THREE.Mesh[] {
    return this.clickTargets
  }

  public getSatellitePosition(id: string): THREE.Vector3 | null {
    const group = this.satMeshes.get(id)
    return group ? group.position.clone() : null
  }

  public dispose() {
    this.busGeo.dispose()
    this.panelGeo.dispose()
    this.dishGeo.dispose()
    this.reticleGeo.dispose()
    this.stationDishGeo.dispose()
    this.stationRingGeo.dispose()
    this.satBusMat.dispose()
    this.panelMat.dispose()
    this.stationMat.dispose()
    this.stationRingMat.dispose()
    this.satMeshes.clear()
    this.orbitLines.clear()
    this.nadirLines.clear()
    this.footprintMeshes.clear()
    this.clickTargets = []
    this.group.clear()
  }
}
