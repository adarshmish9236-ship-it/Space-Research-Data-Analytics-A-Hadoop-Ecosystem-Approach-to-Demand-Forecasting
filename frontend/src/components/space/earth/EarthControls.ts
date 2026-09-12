import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CameraPreset } from './types'

export class EarthControls {
  public controls: OrbitControls
  private camera: THREE.PerspectiveCamera

  // Smooth camera interpolation targets
  private targetPosition: THREE.Vector3 | null = null
  private targetLookAt: THREE.Vector3 | null = null
  private isTransitioning = false

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.controls = new OrbitControls(camera, domElement)

    // Smooth aerospace damping
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.rotateSpeed = 0.75
    this.controls.zoomSpeed = 0.9

    // Sensible distance boundaries: prevents clipping inside Earth or drifting away
    this.controls.minDistance = 12.2
    this.controls.maxDistance = 72.0

    // Set initial default orbital perspective
    this.setPreset('default', false)
  }

  public setPreset(preset: CameraPreset, animated = true, focusTargetPos?: THREE.Vector3) {
    let desiredPos = new THREE.Vector3(0, 16, 32)
    let desiredTarget = new THREE.Vector3(0, 0, 0)

    switch (preset) {
      case 'default':
        desiredPos = new THREE.Vector3(12, 14, 28)
        desiredTarget = new THREE.Vector3(0, 0, 0)
        break
      case 'north_pole':
        desiredPos = new THREE.Vector3(0.01, 34, 0.01)
        desiredTarget = new THREE.Vector3(0, 0, 0)
        break
      case 'equatorial':
        desiredPos = new THREE.Vector3(34, 0, 0)
        desiredTarget = new THREE.Vector3(0, 0, 0)
        break
      case 'focus':
        if (focusTargetPos) {
          desiredTarget = focusTargetPos.clone()
          // Position camera offset along the target vector plus altitude
          const offset = focusTargetPos.clone().normalize().multiplyScalar(focusTargetPos.length() + 6.5)
          offset.y += 1.5
          desiredPos = offset
        }
        break
    }

    if (animated) {
      this.targetPosition = desiredPos
      this.targetLookAt = desiredTarget
      this.isTransitioning = true
    } else {
      this.camera.position.copy(desiredPos)
      this.controls.target.copy(desiredTarget)
      this.controls.update()
      this.isTransitioning = false
    }
  }

  public update() {
    if (this.isTransitioning && this.targetPosition && this.targetLookAt) {
      this.camera.position.lerp(this.targetPosition, 0.08)
      this.controls.target.lerp(this.targetLookAt, 0.08)

      if (
        this.camera.position.distanceTo(this.targetPosition) < 0.05 &&
        this.controls.target.distanceTo(this.targetLookAt) < 0.05
      ) {
        this.camera.position.copy(this.targetPosition)
        this.controls.target.copy(this.targetLookAt)
        this.isTransitioning = false
      }
    }

    this.controls.update()
  }

  public onUserInteraction() {
    // If the user manually grabs the mouse during a camera glide, cancel transition
    if (this.isTransitioning) {
      this.isTransitioning = false
    }
  }

  public dispose() {
    this.controls.dispose()
  }
}
