import React, { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import type { Satellite, GroundStation, CameraPreset, EarthVisualizationSettings } from './types'
import { EarthGlobe } from './EarthGlobe'
import { SatelliteLayer } from './SatelliteLayer'
import { EarthControls } from './EarthControls'
import { createSpaceBackground } from './SpaceBackground'

interface EarthSceneProps {
  satellites: Satellite[]
  groundStations: GroundStation[]
  selectedSatellite: Satellite | null
  settings: EarthVisualizationSettings
  cameraPreset: CameraPreset
  onSelectSatellite: (sat: Satellite | null) => void
}

export const EarthScene: React.FC<EarthSceneProps> = ({
  satellites,
  groundStations,
  selectedSatellite,
  settings,
  cameraPreset,
  onSelectSatellite,
}) => {
  const mountRef = useRef<HTMLDivElement>(null)

  // Three.js instances ref
  const engineRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    globe: EarthGlobe
    satLayer: SatelliteLayer
    controls: EarthControls
    starfield: THREE.Points
    raycaster: THREE.Raycaster
    mouse: THREE.Vector2
    animId: number
    clock: THREE.Clock
  } | null>(null)

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Initialize 3D Engine
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current
    const width = container.clientWidth || 800
    const height = container.clientHeight || 420

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020409)

    // Camera (Orbital perspective: Earth occupies ~70% of frame)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(12, 14, 28)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Lighting (Single physically accurate Sun directional source)
    const sunLight = new THREE.DirectionalLight(0xfffaec, 2.0)
    const sunDir = new THREE.Vector3(1.2, 0.4, 0.8).normalize()
    sunLight.position.copy(sunDir.clone().multiplyScalar(50))
    scene.add(sunLight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
    scene.add(ambientLight)

    // Deep space background
    const starfield = createSpaceBackground(380, 1800)
    scene.add(starfield)

    // Core Earth Globe
    const globe = new EarthGlobe(10.0)
    globe.setSunDirection(sunDir)
    scene.add(globe.group)

    // Satellite & Orbital Trajectory Layer
    const satLayer = new SatelliteLayer(10.0)
    satLayer.setGroundStations(groundStations)
    satLayer.setSatellites(satellites, selectedSatellite?.id || null, settings.showFootprints, settings.showOrbits)
    scene.add(satLayer.group)

    // Controls
    const controls = new EarthControls(camera, renderer.domElement)

    // Raycaster for 3D selection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const clock = new THREE.Clock()

    // Animation Loop
    let animId = 0
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      // Update globe and clouds
      globe.update(delta, settings.autoRotate)

      // Update real-time continuous satellite orbital motion
      satLayer.update(elapsed)

      // Update camera controls
      controls.update()

      renderer.render(scene, camera)
    }
    animate()

    engineRef.current = {
      scene,
      camera,
      renderer,
      globe,
      satLayer,
      controls,
      starfield,
      raycaster,
      mouse,
      animId,
      clock,
    }

    // Resize Handler
    const handleResize = () => {
      if (!container || !engineRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight || 420
      engineRef.current.camera.aspect = w / h
      engineRef.current.camera.updateProjectionMatrix()
      engineRef.current.renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      controls.dispose()
      globe.dispose()
      satLayer.dispose()
      starfield.geometry.dispose()
      ;(starfield.material as THREE.Material).dispose()
      renderer.dispose()
      if (container) container.innerHTML = ''
      engineRef.current = null
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Sync Settings & Data
  // ──────────────────────────────────────────────────────────────────────────

  // Sync Daylight Mode
  useEffect(() => {
    if (!engineRef.current) return
    engineRef.current.globe.setDaylightMode(settings.daylight)
  }, [settings.daylight])

  // Sync Cloud Layer
  useEffect(() => {
    if (!engineRef.current) return
    engineRef.current.globe.setCloudVisibility(settings.clouds)
  }, [settings.clouds])

  // Sync Satellites & Orbits
  useEffect(() => {
    if (!engineRef.current) return
    engineRef.current.satLayer.setSatellites(
      satellites,
      selectedSatellite?.id || null,
      settings.showFootprints,
      settings.showOrbits
    )
  }, [satellites, selectedSatellite, settings.showFootprints, settings.showOrbits])

  // Sync Ground Stations
  useEffect(() => {
    if (!engineRef.current) return
    engineRef.current.satLayer.setGroundStations(groundStations)
  }, [groundStations])

  // Sync Camera Presets
  useEffect(() => {
    if (!engineRef.current) return
    let focusPos: THREE.Vector3 | undefined
    if (cameraPreset === 'focus' && selectedSatellite) {
      focusPos = engineRef.current.satLayer.getSatellitePosition(selectedSatellite.id) || undefined
    }
    engineRef.current.controls.setPreset(cameraPreset, true, focusPos)
  }, [cameraPreset, selectedSatellite])

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Interactive Raycasting: 3D Click & Hover Selection
  // ──────────────────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current || !mountRef.current) return
    const rect = mountRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    engineRef.current.mouse.set(x, y)
    engineRef.current.raycaster.setFromCamera(engineRef.current.mouse, engineRef.current.camera)

    const targets = engineRef.current.satLayer.getClickTargets()
    const intersects = engineRef.current.raycaster.intersectObjects(targets, false)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const sat = hit.object.userData?.sat
      if (sat) {
        onSelectSatellite(sat)
      }
    } else {
      engineRef.current.controls.onUserInteraction()
    }
  }, [onSelectSatellite])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!engineRef.current || !mountRef.current) return
    const rect = mountRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    engineRef.current.mouse.set(x, y)
    engineRef.current.raycaster.setFromCamera(engineRef.current.mouse, engineRef.current.camera)

    const targets = engineRef.current.satLayer.getClickTargets()
    const intersects = engineRef.current.raycaster.intersectObjects(targets, false)

    if (intersects.length > 0) {
      mountRef.current.style.cursor = 'pointer'
    } else {
      mountRef.current.style.cursor = 'grab'
    }
  }, [])

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
      }}
    />
  )
}
