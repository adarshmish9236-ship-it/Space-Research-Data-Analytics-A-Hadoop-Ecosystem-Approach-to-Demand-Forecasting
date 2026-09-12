import * as THREE from 'three'
import { EarthSurfaceShader } from './shaders/earthShader'
import { EarthAtmosphereShader } from './shaders/atmosphereShader'

export class EarthGlobe {
  public group: THREE.Group
  public earthMesh: THREE.Mesh
  public cloudsMesh: THREE.Mesh
  public atmosphereMesh: THREE.Mesh
  public equatorLine: THREE.Line

  private earthMat: THREE.ShaderMaterial
  private cloudsMat: THREE.MeshStandardMaterial
  private atmosphereMat: THREE.ShaderMaterial

  // Cloud opacity transition state
  private targetCloudOpacity = 0.72
  private currentCloudOpacity = 0.72

  // Textures cache
  private textures: {
    day?: THREE.Texture
    night?: THREE.Texture
    clouds?: THREE.Texture
    specular?: THREE.Texture
    normal?: THREE.Texture
  } = {}

  constructor(earthRadius = 10.0, onLoaded?: () => void) {
    this.group = new THREE.Group()

    const textureLoader = new THREE.TextureLoader()

    // 1. Load authentic NASA satellite texture assets with error handling
    const loadTexture = (path: string) => {
      const tex = textureLoader.load(
        path,
        () => onLoaded?.(),
        undefined,
        (err) => console.warn(`Could not load texture ${path}, using fallback:`, err)
      )
      tex.colorSpace = THREE.SRGBColorSpace
      return tex
    }

    this.textures.day = loadTexture('/textures/earth/earth_day.jpg')
    this.textures.night = loadTexture('/textures/earth/earth_night.jpg')
    this.textures.clouds = loadTexture('/textures/earth/earth_clouds.png')
    this.textures.specular = loadTexture('/textures/earth/earth_specular.jpg')
    this.textures.normal = loadTexture('/textures/earth/earth_normal.jpg')

    // 2. Core Photorealistic Earth Sphere
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64)
    this.earthMat = new THREE.ShaderMaterial({
      vertexShader: EarthSurfaceShader.vertexShader,
      fragmentShader: EarthSurfaceShader.fragmentShader,
      uniforms: {
        tDay: { value: this.textures.day },
        tNight: { value: this.textures.night },
        tSpecular: { value: this.textures.specular },
        tNormal: { value: this.textures.normal },
        sunDirection: { value: new THREE.Vector3(1.2, 0.4, 0.8).normalize() },
        nightCityIntensity: { value: 1.4 },
        ambientLevel: { value: 0.38 },
        daylightEnabled: { value: 1.0 },
      },
    })
    this.earthMesh = new THREE.Mesh(earthGeo, this.earthMat)
    this.group.add(this.earthMesh)

    // 3. Atmospheric Cloud Sphere (Slightly above surface, independent rotation)
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64)
    this.cloudsMat = new THREE.MeshStandardMaterial({
      map: this.textures.clouds,
      transparent: true,
      opacity: this.currentCloudOpacity,
      blending: THREE.NormalBlending,
      roughness: 0.35,
      emissive: new THREE.Color(0x304860),
      emissiveIntensity: 0.35,
    })
    this.cloudsMesh = new THREE.Mesh(cloudsGeo, this.cloudsMat)
    this.group.add(this.cloudsMesh)

    // 4. Scientifically Inspired Atmospheric Scattering Limb Glow
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.018, 64, 64)
    this.atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: EarthAtmosphereShader.vertexShader,
      fragmentShader: EarthAtmosphereShader.fragmentShader,
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1.2, 0.4, 0.8).normalize() },
        atmosphereColor: { value: new THREE.Color(0.24, 0.62, 1.0) },
        intensity: { value: 1.25 },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    })
    this.atmosphereMesh = new THREE.Mesh(atmoGeo, this.atmosphereMat)
    this.group.add(this.atmosphereMesh)

    // 5. Subtle Equator Reference Line
    const equatorGeo = new THREE.BufferGeometry()
    const eqPts: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      eqPts.push(new THREE.Vector3(Math.cos(a) * (earthRadius + 0.04), 0, Math.sin(a) * (earthRadius + 0.04)))
    }
    equatorGeo.setFromPoints(eqPts)
    this.equatorLine = new THREE.Line(
      equatorGeo,
      new THREE.LineBasicMaterial({ color: 0x00c8e8, transparent: true, opacity: 0.2 })
    )
    this.group.add(this.equatorLine)
  }

  public setAmbientLevel(level: number) {
    if (this.earthMat?.uniforms?.ambientLevel) {
      this.earthMat.uniforms.ambientLevel.value = level
    }
  }

  public setDaylightMode(enabled: boolean) {
    this.earthMat.uniforms.daylightEnabled.value = enabled ? 1.0 : 0.0
  }

  public setSunDirection(dir: THREE.Vector3) {
    const normalized = dir.clone().normalize()
    this.earthMat.uniforms.sunDirection.value.copy(normalized)
    this.atmosphereMat.uniforms.sunDirection.value.copy(normalized)
  }

  public setCloudVisibility(visible: boolean) {
    this.targetCloudOpacity = visible ? 0.72 : 0.0
  }

  /**
   * Animation tick: cloud drift, Earth rotation, and smooth opacity transitions
   */
  public update(_delta: number, autoRotate: boolean) {
    // Independent atmospheric cloud layer drift (jet streams)
    this.cloudsMesh.rotation.y += 0.0002

    // Smooth cloud opacity transition
    if (Math.abs(this.currentCloudOpacity - this.targetCloudOpacity) > 0.01) {
      this.currentCloudOpacity += (this.targetCloudOpacity - this.currentCloudOpacity) * 0.1
      this.cloudsMat.opacity = this.currentCloudOpacity
      this.cloudsMesh.visible = this.currentCloudOpacity > 0.02
    }

    // Planetary diurnal rotation if enabled
    if (autoRotate) {
      this.group.rotation.y += 0.0005
    }
  }

  public dispose() {
    this.earthMesh.geometry.dispose()
    this.earthMat.dispose()
    this.cloudsMesh.geometry.dispose()
    this.cloudsMat.dispose()
    this.atmosphereMesh.geometry.dispose()
    this.atmosphereMat.dispose()
    this.equatorLine.geometry.dispose()
    ;(this.equatorLine.material as THREE.Material).dispose()

    Object.values(this.textures).forEach((tex) => tex?.dispose())
    this.group.clear()
  }
}
