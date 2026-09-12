import * as THREE from 'three'

/**
 * Deep-Space Starfield Environment
 * Realistic star distribution, apparent magnitudes, and color temperatures
 * in an authentic aerospace deep-space void.
 */
export function createSpaceBackground(radius = 350, count = 1800): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  const starColors = [
    new THREE.Color(0xffffff), // White (Main sequence)
    new THREE.Color(0xf0f4ff), // Blue-white (O/B type)
    new THREE.Color(0xfff4e8), // Warm yellow-white (G type)
    new THREE.Color(0xffe8d6), // Faint orange (K type)
  ]

  for (let i = 0; i < count; i++) {
    // Distribute uniformly on spherical shell around Earth
    const u = Math.random()
    const v = Math.random()
    const theta = u * 2.0 * Math.PI
    const phi = Math.acos(2.0 * v - 1.0)
    const r = radius * (0.9 + Math.random() * 0.2)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Stellar magnitude & subtle color temperature
    const chosenColor = starColors[Math.floor(Math.random() * starColors.length)]
    // Most stars are faint; few are prominent
    const brightness = Math.pow(Math.random(), 2.5) * 0.75 + 0.15

    colors[i * 3] = chosenColor.r * brightness
    colors[i * 3 + 1] = chosenColor.g * brightness
    colors[i * 3 + 2] = chosenColor.b * brightness

    sizes[i] = 0.6 + Math.random() * 0.8
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.9,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: false,
  })

  const starfield = new THREE.Points(geometry, material)
  return starfield
}
