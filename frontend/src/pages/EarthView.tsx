/**
 * ORBITALYTICS � Cinematic Earth 3D View
 * Full-screen photorealistic Earth globe with:
 *   - Day/Night hemisphere shader (NASA Blue Marble + city lights)
 *   - Rayleigh atmospheric limb scattering
 *   - Drifting cloud layer
 *   - Orbiting Moon with glow halo
 *   - Nebula / galaxy haze deep space background
 *   - Dense star field with color temperatures
 *   - Interactive OrbitControls + auto-cinematic rotation
 *   - Floating HUD overlay with live metadata
 */
import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EarthGlobe } from "../components/space/earth/EarthGlobe"
import {
  Globe, Sun, Moon, Cloud, RotateCw, ZoomIn, ZoomOut,
  Layers, Eye, EyeOff, Maximize2, Navigation, Crosshair,
  Activity, MapPin, ArrowLeft
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

// --- Moon -----------------------------------------------------------------
function createMoon(radius = 2.72): THREE.Group {
  const group = new THREE.Group()
  const geo = new THREE.SphereGeometry(radius, 48, 48)
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.56, 0.54, 0.52),
    roughness: 0.95,
    metalness: 0.0,
  })
  group.add(new THREE.Mesh(geo, mat))

  const haloGeo = new THREE.SphereGeometry(radius * 1.22, 32, 32)
  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.7, 0.75, 0.9),
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  })
  group.add(new THREE.Mesh(haloGeo, haloMat))
  return group
}

// --- Enhanced Starfield ---------------------------------------------------
function createStarfield(radius = 380, count = 4500): THREE.Points {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const palette = [
    new THREE.Color(0x9bb0ff),
    new THREE.Color(0xaabfff),
    new THREE.Color(0xcad7ff),
    new THREE.Color(0xf8f7ff),
    new THREE.Color(0xfff4ea),
    new THREE.Color(0xffd2a1),
    new THREE.Color(0xffb46c),
  ]

  for (let i = 0; i < count; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)
    const r = radius * (0.88 + Math.random() * 0.24)
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    const c = palette[Math.floor(Math.random() * palette.length)]
    const b = Math.pow(Math.random(), 2.2) * 0.8 + 0.12
    colors[i * 3] = c.r * b; colors[i * 3 + 1] = c.g * b; colors[i * 3 + 2] = c.b * b
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3))

  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.95, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: false,
  }))
}

// --- Nebula Haze ----------------------------------------------------------
function createNebula(): THREE.Points {
  const count = 800
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const palette = [
    new THREE.Color(0.04, 0.07, 0.28),
    new THREE.Color(0.06, 0.04, 0.22),
    new THREE.Color(0.02, 0.10, 0.35),
    new THREE.Color(0.08, 0.05, 0.18),
  ]

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const r = 200 + Math.random() * 130
    const s = 60
    positions[i * 3]     = r * Math.cos(theta) * 0.6 + 90 + (Math.random() - 0.5) * s
    positions[i * 3 + 1] = (Math.random() - 0.5) * s * 0.7 - 60
    positions[i * 3 + 2] = r * Math.sin(theta) * 0.4 - 150 + (Math.random() - 0.5) * s
    const c = palette[Math.floor(Math.random() * palette.length)]
    const b = Math.pow(Math.random(), 1.5) * 0.7 + 0.15
    colors[i * 3] = c.r * b; colors[i * 3 + 1] = c.g * b; colors[i * 3 + 2] = c.b * b
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3))

  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.8, vertexColors: true, transparent: true, opacity: 0.55,
    sizeAttenuation: true, blending: THREE.AdditiveBlending,
  }))
}

function rotationToLon(rotY: number): number {
  const lon = ((-rotY * 180 / Math.PI) % 360 + 360) % 360
  return Math.round((lon > 180 ? lon - 360 : lon) * 10) / 10
}

// =========================================================================
export default function EarthView() {
  const mountRef  = useRef<HTMLDivElement>(null)
  const engineRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    globe: EarthGlobe
    moonPivot: THREE.Object3D
    controls: OrbitControls
    clock: THREE.Clock
    animId: number
    sunLight: THREE.DirectionalLight
  } | null>(null)

  const navigate = useNavigate()

  const [hudVisible, setHudVisible] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)
  const [nightMode,  setNightMode]  = useState(false)
  const [showClouds, setShowClouds] = useState(true)
  const [lon,  setLon]  = useState(-97.0)
  const [fps,  setFps]  = useState(60)
  const [zoom, setZoom] = useState(0)
  const [moonDeg, setMoonDeg] = useState(0)
  const [time, setTime] = useState("")

  const fpsRef = useRef({ frames: 0, last: performance.now() })

  useEffect(() => {
    if (!mountRef.current) return
    const el = mountRef.current
    const W = el.clientWidth  || window.innerWidth
    const H = el.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000205)

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1200)
    camera.position.set(0, 2.0, 26.0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.55
    el.innerHTML = ""
    el.appendChild(renderer.domElement)

    // Lighting: Direct solar illumination on camera-facing hemisphere
    const sunDir = new THREE.Vector3(-0.4, 0.45, 1.25).normalize()
    const sunLight = new THREE.DirectionalLight(0xfffbf2, 3.4)
    sunLight.position.copy(sunDir.clone().multiplyScalar(100))
    scene.add(sunLight)
    scene.add(new THREE.AmbientLight(0x557799, 1.8))
    const rimLight = new THREE.DirectionalLight(0x4090ff, 1.2)
    rimLight.position.set(25, -15, -20)
    scene.add(rimLight)

    // Starfield + nebula
    scene.add(createStarfield(380, 4500))
    scene.add(createNebula())

    // Earth
    const globe = new EarthGlobe(10.0)
    globe.setSunDirection(sunDir)
    globe.setAmbientLevel(0.42)
    globe.group.rotation.y = -1.05
    scene.add(globe.group)

    // Moon
    const moonPivot = new THREE.Object3D()
    scene.add(moonPivot)
    const moon = createMoon(2.72)
    moon.position.set(36, -14, 0)
    moonPivot.add(moon)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.04
    controls.rotateSpeed     = 0.65
    controls.zoomSpeed       = 0.8
    controls.minDistance     = 12.5
    controls.maxDistance     = 80.0
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.35

    const clock = new THREE.Clock()
    let animId = 0

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const delta   = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      // FPS
      fpsRef.current.frames++
      const now = performance.now()
      if (now - fpsRef.current.last >= 1000) {
        setFps(Math.round(fpsRef.current.frames * 1000 / (now - fpsRef.current.last)))
        fpsRef.current = { frames: 0, last: now }
      }

      globe.update(delta, false)
      if (controls.autoRotate) globe.group.rotation.y += 0.0006

      moonPivot.rotation.y = elapsed * 0.04
      setMoonDeg(Math.round((moonPivot.rotation.y * 180 / Math.PI) % 360))

      // Gentle solar drift preserving camera-facing daylight
      const st = elapsed * 0.015
      const newSunDir = new THREE.Vector3(-0.4 + Math.sin(st) * 0.2, 0.45 + Math.cos(st) * 0.1, 1.25).normalize()
      globe.setSunDirection(newSunDir)
      sunLight.position.copy(newSunDir.clone().multiplyScalar(100))

      controls.update()

      setLon(rotationToLon(globe.group.rotation.y))
      setZoom(Math.round((controls.getDistance() - controls.minDistance) / (controls.maxDistance - controls.minDistance) * 100))
      setTime(new Date().toISOString().slice(11, 19) + " UTC")

      renderer.render(scene, camera)
    }
    animate()

    engineRef.current = { scene, camera, renderer, globe, moonPivot, controls, clock, animId, sunLight }

    const handleResize = () => {
      if (!el || !engineRef.current) return
      const w = el.clientWidth, h = el.clientHeight
      engineRef.current.camera.aspect = w / h
      engineRef.current.camera.updateProjectionMatrix()
      engineRef.current.renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(handleResize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      controls.dispose()
      globe.dispose()
      renderer.dispose()
      if (el) el.innerHTML = ""
      engineRef.current = null
    }
  }, [])

  useEffect(() => { if (engineRef.current) engineRef.current.controls.autoRotate = autoRotate }, [autoRotate])
  useEffect(() => { if (engineRef.current) engineRef.current.globe.setDaylightMode(!nightMode) }, [nightMode])
  useEffect(() => { if (engineRef.current) engineRef.current.globe.setCloudVisibility(showClouds) }, [showClouds])

  const zoomIn  = useCallback(() => {
    if (!engineRef.current) return
    const { camera, controls } = engineRef.current
    const dir = camera.position.clone().normalize()
    camera.position.copy(dir.multiplyScalar(Math.max(controls.minDistance, camera.position.length() - 3.5)))
    controls.update()
  }, [])

  const zoomOut = useCallback(() => {
    if (!engineRef.current) return
    const { camera, controls } = engineRef.current
    const dir = camera.position.clone().normalize()
    camera.position.copy(dir.multiplyScalar(Math.min(controls.maxDistance, camera.position.length() + 3.5)))
    controls.update()
  }, [])

  const resetView = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.camera.position.set(0, 5, 30)
    engineRef.current.controls.target.set(0, 0, 0)
    engineRef.current.controls.update()
  }, [])

  // Reusable HUD panel style
  const panel: React.CSSProperties = {
    background: "rgba(0,0,0,0.62)",
    border: "1px solid rgba(0,200,232,0.20)",
    borderRadius: 12, padding: "0.85rem",
    backdropFilter: "blur(10px)",
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000205" }}>
      {/* Canvas */}
      <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 0, cursor: "grab" }} />

      {/* -- Top-left --------------------------------------------------- */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <motion.button
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,200,232,0.35)",
            borderRadius: 8, padding: "6px 12px", color: "#00c8e8", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 600,
            backdropFilter: "blur(8px)",
          }}
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,200,232,0.25)", borderRadius: 8, padding: "6px 14px", backdropFilter: "blur(8px)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={14} color="#00c8e8" />
            <span style={{ fontWeight: 800, fontSize: "0.88rem", letterSpacing: "0.12em", color: "#fff" }}>EARTH � 3D VIEW</span>
            <span style={{ background: "rgba(0,200,232,0.15)", border: "1px solid rgba(0,200,232,0.4)", borderRadius: 4, padding: "1px 7px", fontSize: "0.6rem", fontWeight: 700, color: "#00c8e8" }}>LIVE</span>
          </div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.38)", marginTop: 1, fontFamily: "monospace" }}>
            WebGL � NASA Blue Marble � Custom GLSL Shaders
          </div>
        </motion.div>
      </div>

      {/* -- Top-center shader badges ------------------------------------ */}
      <AnimatePresence>
        {hudVisible && (
          <motion.div key="badges" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.7 }}
            style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 6 }}
          >
            {[
              { label: "RAYLEIGH SCATTER", color: "#60a5fa" },
              { label: "CITY LIGHTS",      color: "#fbbf24" },
              { label: "OCEAN SPECULAR",   color: "#34d399" },
              { label: "CLOUD DRIFT",      color: "#94a3b8" },
              { label: "MOON ORBIT",       color: "#c084fc" },
            ].map(({ label, color }) => (
              <div key={label} style={{
                background: "rgba(0,0,0,0.55)", border: `1px solid ${color}30`,
                borderRadius: 5, padding: "3px 8px", fontSize: "0.58rem", fontWeight: 700,
                color, letterSpacing: "0.08em", backdropFilter: "blur(6px)",
              }}>{label}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Top-right HUD toggle --------------------------------------- */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        onClick={() => setHudVisible(v => !v)}
        style={{
          position: "absolute", top: 20, right: 20, zIndex: 10,
          background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8, padding: "8px 14px", color: "rgba(255,255,255,0.6)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          fontSize: "0.75rem", backdropFilter: "blur(8px)",
        }}
      >
        {hudVisible ? <EyeOff size={13} /> : <Eye size={13} />}
        {hudVisible ? "Hide HUD" : "Show HUD"}
      </motion.button>

      {/* -- Right panel: telemetry + atmosphere ------------------------ */}
      <AnimatePresence>
        {hudVisible && (
          <motion.div key="hud" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.35 }}
            style={{ position: "absolute", top: 70, right: 20, zIndex: 10, width: 210, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={panel}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <Activity size={12} color="#00c8e8" />
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#00c8e8", letterSpacing: "0.1em" }}>LIVE TELEMETRY</span>
              </div>
              {[
                ["UTC TIME",    time],
                ["SURFACE LON", `${lon}�`],
                ["ORBIT ALT",   "408 km LEO"],
                ["MOON PHASE",  `${moonDeg}�`],
                ["RENDER FPS",  `${fps}`],
                ["ZOOM",        `${zoom}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={panel}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <Layers size={12} color="#a78bfa" />
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em" }}>ATMOSPHERE</span>
              </div>
              {[
                { label: "N2",  value: "78.1%", bar: 78.1, color: "#60a5fa" },
                { label: "O2",  value: "20.9%", bar: 20.9, color: "#34d399" },
                { label: "Ar",  value: "0.93%", bar: 0.93,  color: "#a78bfa" },
                { label: "CO2", value: "0.04%", bar: 0.04,  color: "#fbbf24" },
              ].map(({ label, value, bar, color }) => (
                <div key={label} style={{ marginBottom: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.5)" }}>{label}</span>
                    <span style={{ fontSize: "0.62rem", color, fontFamily: "monospace" }}>{value}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(bar, 1.5)}%` }} transition={{ duration: 1.2, delay: 0.5 }}
                      style={{ height: "100%", background: color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Left panel: controls --------------------------------------- */}
      <AnimatePresence>
        {hudVisible && (
          <motion.div key="controls" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
            style={{ position: "absolute", bottom: 30, left: 20, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={{ ...panel, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Auto Rotate",  icon: RotateCw, active: autoRotate, onClick: () => setAutoRotate(v => !v), color: "#00c8e8" },
                { label: nightMode ? "Day Mode" : "Night Lights", icon: nightMode ? Sun : Moon, active: nightMode, onClick: () => setNightMode(v => !v), color: "#f59e0b" },
                { label: "Cloud Layer", icon: Cloud, active: showClouds, onClick: () => setShowClouds(v => !v), color: "#60a5fa" },
              ].map(({ label, icon: Icon, active, onClick, color }) => (
                <button key={label} onClick={onClick} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: active ? `${color}20` : "transparent",
                  border: `1px solid ${active ? color + "60" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 7, padding: "7px 12px",
                  color: active ? color : "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                  transition: "all 0.2s", width: "100%", textAlign: "left",
                }}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            <div style={{ ...panel, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Zoom In",    icon: ZoomIn,    fn: zoomIn   },
                { label: "Zoom Out",   icon: ZoomOut,   fn: zoomOut  },
                { label: "Reset View", icon: Maximize2, fn: resetView },
              ].map(({ label, icon: Icon, fn }) => (
                <button key={label} onClick={fn} style={{
                  display: "flex", alignItems: "center", gap: 8, background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "7px 12px",
                  color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                  width: "100%", textAlign: "left", transition: "all 0.15s",
                }}
                  onMouseEnter={e => { const b = e.currentTarget; b.style.color="#fff"; b.style.borderColor="rgba(0,200,232,0.4)"; b.style.background="rgba(0,200,232,0.08)" }}
                  onMouseLeave={e => { const b = e.currentTarget; b.style.color="rgba(255,255,255,0.55)"; b.style.borderColor="rgba(255,255,255,0.08)"; b.style.background="transparent" }}
                >
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Bottom-center coords bar ------------------------------------ */}
      <AnimatePresence>
        {hudVisible && (
          <motion.div key="coords" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ delay: 0.4 }}
            style={{
              position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", zIndex: 10,
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(0,0,0,0.58)", border: "1px solid rgba(0,200,232,0.2)",
              borderRadius: 10, padding: "8px 20px", backdropFilter: "blur(10px)",
            }}
          >
            <Crosshair size={13} color="#00c8e8" />
            <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>EARTH CENTER</span>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
            <MapPin size={11} color="#a78bfa" />
            <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#e2e8f0" }}>0�N &nbsp; {lon.toFixed(1)}�</span>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
            <Navigation size={11} color="#34d399" />
            <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#34d399" }}>{time}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
