import * as THREE from 'three'

/**
 * Scientifically Inspired Atmospheric Scattering Shader
 * Generates a thin, natural atmospheric limb glow (Rayleigh scattering)
 * around the Earth horizon without cartoon neon halos or thick glowing rings.
 */
export const EarthAtmosphereShader = {
  uniforms: {
    sunDirection: { value: new THREE.Vector3(1.0, 0.4, 0.7).normalize() },
    atmosphereColor: { value: new THREE.Color(0.26, 0.58, 0.92) },
    intensity: { value: 0.8 },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3 sunDirection;
    uniform vec3 atmosphereColor;
    uniform float intensity;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(vNormal);

      // Backside rim calculation for horizon scattering
      float rim = dot(normal, viewDir);
      float alpha = clamp(pow(1.0 - rim, 3.2), 0.0, 1.0);

      // Sun orientation modulation - atmosphere glows brighter towards sunlit side
      vec3 sunDir = normalize(sunDirection);
      float sunFacing = dot(normal, sunDir);
      float sunFactor = smoothstep(-0.2, 0.6, sunFacing) * 0.75 + 0.25;

      vec3 color = atmosphereColor * sunFactor;
      float finalAlpha = alpha * intensity * sunFactor * 0.45;

      gl_FragColor = vec4(color, finalAlpha);
    }
  `,
}
