import * as THREE from 'three'

/**
 * Photorealistic Earth Surface Shader
 * - Physically modeled Day/Night terminator blending
 * - City lights isolated to the dark hemisphere
 * - Ocean specular reflection glint
 * - Rayleigh daytime limb scattering
 */
export const EarthSurfaceShader = {
  uniforms: {
    tDay: { value: null as THREE.Texture | null },
    tNight: { value: null as THREE.Texture | null },
    tSpecular: { value: null as THREE.Texture | null },
    tNormal: { value: null as THREE.Texture | null },
    sunDirection: { value: new THREE.Vector3(1.0, 0.4, 0.7).normalize() },
    nightCityIntensity: { value: 1.4 },
    ambientLevel: { value: 0.35 },
    daylightEnabled: { value: 1.0 }, // 1.0 = true sunlight, 0.0 = uniform twilight visibility
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform sampler2D tDay;
    uniform sampler2D tNight;
    uniform sampler2D tSpecular;
    uniform sampler2D tNormal;
    uniform vec3 sunDirection;
    uniform float nightCityIntensity;
    uniform float ambientLevel;
    uniform float daylightEnabled;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 sunDir = normalize(sunDirection);

      // Normal map perturbance for terrain relief
      vec3 normalSample = texture2D(tNormal, vUv).rgb * 2.0 - 1.0;
      normal = normalize(normal + normalSample * 0.35);

      // Sun lighting dot product
      float NdotL = dot(normal, sunDir);

      // Smooth terminator transition
      // Values > 0 are day, < 0 are night, with smooth twilight transition
      float dayFactor = smoothstep(-0.18, 0.15, NdotL);
      float nightFactor = 1.0 - smoothstep(-0.25, 0.05, NdotL);

      // If daylight is toggled to Night Lights view mode, boost night visibility
      if (daylightEnabled < 0.5) {
        dayFactor = 0.25;
        nightFactor = 1.0;
      }

      // Sample textures
      vec3 dayColor = texture2D(tDay, vUv).rgb;
      vec3 nightColor = texture2D(tNight, vUv).rgb;
      float specMask = texture2D(tSpecular, vUv).r;

      // Vibrant ocean enhancement (giving the photorealistic NASA turquoise/azure glow)
      if (specMask > 0.05) {
        dayColor = mix(dayColor, vec3(0.04, 0.44, 0.82), specMask * 0.28);
      }

      // Specular ocean reflection (Blinn-Phong glint with cyan sun radiance)
      vec3 halfDir = normalize(sunDir + viewDir);
      float NdotH = max(dot(normal, halfDir), 0.0);
      vec3 specularGlint = vec3(0.4, 0.85, 1.0) * pow(NdotH, 22.0) * specMask * 0.55 * dayFactor * daylightEnabled;

      // City lights strictly on the night hemisphere
      vec3 cityLights = nightColor * nightFactor * nightCityIntensity;

      // Day diffuse lighting with ambient fill (boosted for brilliant Blue Marble photorealism)
      vec3 surfaceDiffuse = dayColor * (ambientLevel + (1.0 - ambientLevel) * dayFactor * 1.2);

      // Delicate Rayleigh atmospheric scattering on sunlit limb
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);
      vec3 limbScattering = vec3(0.25, 0.65, 1.0) * fresnel * (dayFactor * 0.75 + 0.25) * 0.85;

      // Combine all lighting terms
      vec3 finalColor = surfaceDiffuse + cityLights + specularGlint + limbScattering;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}
