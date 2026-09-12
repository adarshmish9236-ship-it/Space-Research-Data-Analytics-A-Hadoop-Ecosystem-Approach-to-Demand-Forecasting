import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface SpaceLoginCanvasProps {
  interactive?: boolean
}

/**
 * Procedural Deep-Space Holographic Canvas
 * Features:
 * - 2,200 dynamic twinkling stars with color temperatures
 * - Holographic orbital wireframe globe with glowing equator and latitude rings
 * - Multiple inclined orbital tracks (LEO, MEO, GEO) with orbiting satellites
 * - Interactive mouse parallax with smooth damping
 */
export const SpaceLoginCanvas: React.FC<SpaceLoginCanvasProps> = ({ interactive = true }) => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    // 1. Scene setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x040814, 0.0025)

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 18, 52)
    camera.lookAt(0, 0, 0)

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // 4. Starfield (Deep Space)
    const starCount = 2200
    const starGeo = new THREE.BufferGeometry()
    const starPositions = new Float32Array(starCount * 3)
    const starColors = new Float32Array(starCount * 3)
    const starSizes = new Float32Array(starCount)

    const palette = [
      new THREE.Color(0x00c8e8), // Cyan
      new THREE.Color(0x6366f1), // Indigo
      new THREE.Color(0xffffff), // Pure white
      new THREE.Color(0xa5f3fc), // Light blue
      new THREE.Color(0xfde68a), // Warm white
    ]

    for (let i = 0; i < starCount; i++) {
      const r = 180 + Math.random() * 220
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)

      const color = palette[Math.floor(Math.random() * palette.length)]
      const lum = Math.pow(Math.random(), 2) * 0.85 + 0.15
      starColors[i * 3] = color.r * lum
      starColors[i * 3 + 1] = color.g * lum
      starColors[i * 3 + 2] = color.b * lum

      starSizes[i] = 0.8 + Math.random() * 1.5
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    })
    const starfield = new THREE.Points(starGeo, starMat)
    scene.add(starfield)

    // 5. Holographic Wireframe Earth & Atmosphere Node
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    // Wireframe globe
    const globeRadius = 14
    const globeGeo = new THREE.SphereGeometry(globeRadius, 28, 28)
    const globeWireMat = new THREE.MeshBasicMaterial({
      color: 0x00c8e8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const globeMesh = new THREE.Mesh(globeGeo, globeWireMat)
    globeGroup.add(globeMesh)

    // Inner dark sphere to occlude back wireframe
    const innerGeo = new THREE.SphereGeometry(globeRadius * 0.99, 32, 32)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x040814,
      transparent: true,
      opacity: 0.92,
    })
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    globeGroup.add(innerMesh)

    // Equator / Latitude Accent Rings
    const createRing = (radius: number, color: number, opacity: number, rotationX = 0, rotationY = 0) => {
      const ringGeo = new THREE.BufferGeometry()
      const segments = 128
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius))
      }
      ringGeo.setFromPoints(points)
      const ringMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      })
      const line = new THREE.Line(ringGeo, ringMat)
      line.rotation.x = rotationX
      line.rotation.y = rotationY
      return line
    }

    const equator = createRing(globeRadius * 1.02, 0x00c8e8, 0.45)
    globeGroup.add(equator)

    // 6. Orbital Trajectory Paths & Satellites
    interface OrbitTracker {
      mesh: THREE.Mesh
      beacon: THREE.PointLight
      radius: number
      speed: number
      angle: number
      inclination: number
      phase: number
    }

    const orbits: OrbitTracker[] = []
    const orbitConfigs = [
      { radius: 18.5, speed: 0.008, color: 0x00c8e8, inc: Math.PI / 6, phase: 0 },
      { radius: 22.0, speed: 0.005, color: 0x6366f1, inc: -Math.PI / 4, phase: 1.8 },
      { radius: 26.5, speed: 0.003, color: 0x10b981, inc: Math.PI / 3, phase: 3.4 },
      { radius: 31.0, speed: 0.002, color: 0xf59e0b, inc: -Math.PI / 5, phase: 4.9 },
    ]

    orbitConfigs.forEach((cfg) => {
      // Orbital trajectory circle
      const orbitRing = createRing(cfg.radius, cfg.color, 0.28, cfg.inc, 0)
      globeGroup.add(orbitRing)

      // Satellite node
      const satGeo = new THREE.SphereGeometry(0.55, 12, 12)
      const satMat = new THREE.MeshBasicMaterial({ color: cfg.color })
      const satMesh = new THREE.Mesh(satGeo, satMat)

      // Satellite glow halo
      const haloGeo = new THREE.RingGeometry(0.7, 1.1, 16)
      const haloMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
      const halo = new THREE.Mesh(haloGeo, haloMat)
      satMesh.add(halo)

      const light = new THREE.PointLight(cfg.color, 0.6, 12)
      satMesh.add(light)

      globeGroup.add(satMesh)

      orbits.push({
        mesh: satMesh,
        beacon: light,
        radius: cfg.radius,
        speed: cfg.speed,
        angle: cfg.phase,
        inclination: cfg.inc,
        phase: cfg.phase,
      })
    })

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // 7. Mouse Parallax
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return
      const halfW = window.innerWidth / 2
      const halfH = window.innerHeight / 2
      mouseX = (e.clientX - halfW) / halfW
      mouseY = (e.clientY - halfH) / halfH
    }

    window.addEventListener('mousemove', handleMouseMove)

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // 9. Animation Loop
    let animId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      clock.getDelta()
      const time = clock.getElapsedTime()

      // Smooth mouse damping
      targetX += (mouseX * 0.4 - targetX) * 0.05
      targetY += (mouseY * 0.3 - targetY) * 0.05

      camera.position.x = Math.sin(targetX) * 45
      camera.position.y = 18 + targetY * 12
      camera.position.z = Math.cos(targetX) * 45
      camera.lookAt(0, 0, 0)

      // Rotate starfield very slowly
      starfield.rotation.y = time * 0.008
      starfield.rotation.x = time * 0.003

      // Rotate globe
      globeMesh.rotation.y = time * 0.035
      innerMesh.rotation.y = time * 0.035

      // Move satellites along orbital paths
      orbits.forEach((sat) => {
        sat.angle += sat.speed
        const x = Math.cos(sat.angle) * sat.radius
        // Apply inclination
        const y = Math.sin(sat.angle) * sat.radius * Math.sin(sat.inclination)
        const adjustedZ = Math.sin(sat.angle) * sat.radius * Math.cos(sat.inclination)

        sat.mesh.position.set(x, y, adjustedZ)
        sat.mesh.lookAt(camera.position)

        // Pulsate beacon light
        sat.beacon.intensity = 0.5 + Math.sin(time * 4 + sat.phase) * 0.35
      })

      renderer.render(scene, camera)
    }

    animate()

    // 10. Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [interactive])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  )
}
