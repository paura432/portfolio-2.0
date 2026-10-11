import { Color, MeshStandardMaterial, Vector2, Vector3 } from "three";
import { WAKE_LIFE, WAKE_POINTS } from "./wake";
import { GERSTNER_GLSL, SHORE_DAMP_DISTANCE, WAVES, waveUniforms } from "./waves";

/**
 * Stylized water (V6): a MeshStandardMaterial with shader injection, so fog,
 * tone mapping, the scene lights and the quality tiers stay unified with the
 * rest of the world (same pattern as the V4 canopy sway).
 *
 * Vertex: Gerstner displacement and analytic normal from the shared table,
 *   damped toward the coast by the baked `aShore` attribute.
 * Fragment: deep → shallow colour by shore distance, shore foam band, crest
 *   whitecaps (high/medium), boat wake foam along the recorded trail, a soft
 *   Fresnel sky tint toward the horizon. No reflection pass, no depth texture.
 */
export const OCEAN_COLORS = {
  deep: "#0A2644",
  shallow: "#1A6478",
  foam: "#C4E6EC",
  sky: "#6E9CCB",
} as const;

export const oceanUniforms = {
  uTime: { value: 0 },
  uShoreDamp: { value: SHORE_DAMP_DISTANCE },
  uTotalAmp: { value: WAVES.reduce((a, w) => a + w.amplitude, 0) },
  /** 0 disables crest whitecaps (low tier). */
  uWhitecaps: { value: 1 },
  uDeep: { value: new Color(OCEAN_COLORS.deep) },
  uShallow: { value: new Color(OCEAN_COLORS.shallow) },
  uFoam: { value: new Color(OCEAN_COLORS.foam) },
  uSky: { value: new Color(OCEAN_COLORS.sky) },
  /** Boat stern position (xz) and whether a wake is active (z component of uBoat = strength). */
  uBoat: { value: new Vector3(0, 0, 0) },
  uBoatDir: { value: new Vector2(0, 1) },
  uWake: { value: Array.from({ length: WAKE_POINTS }, () => new Vector3(0, 0, -1e9)) },
  uWakeStrength: { value: new Float32Array(WAKE_POINTS) },
  uWakeCount: { value: 0 },
  uWakeLife: { value: WAKE_LIFE },
  ...waveUniforms(),
  // three.js flattens vec2 arrays through `toArray`, so the directions must be Vector2 objects.
  uWaveDir: { value: waveUniforms().uWaveDir.value.map(([x, z]) => new Vector2(x, z)) },
};

const VERTEX_PARS = /* glsl */ `
uniform float uTime;
uniform float uShoreDamp;
uniform float uTotalAmp;
attribute float aShore;
attribute float aDense;
varying float vShore;
varying float vDense;
varying float vCrest;
varying vec2 vWorldXZ;
${GERSTNER_GLSL}
float shoreDampGlsl(float d) {
  float t = clamp(d / uShoreDamp, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
`;

const VERTEX_BEGIN = /* glsl */ `
float oceanDamp = shoreDampGlsl(aShore) * aDense;
vec3 oceanD = gerstner(position.xz, uTime, oceanDamp);
transformed += oceanD;
vShore = aShore;
vDense = aDense;
vCrest = uTotalAmp > 0.0 ? oceanD.y / uTotalAmp : 0.0;
vWorldXZ = position.xz + oceanD.xz;
`;

const VERTEX_NORMAL = /* glsl */ `
objectNormal = gerstnerNormal(position.xz, uTime, shoreDampGlsl(aShore) * aDense);
`;

const FRAGMENT_PARS = /* glsl */ `
uniform float uTime;
uniform float uWhitecaps;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 uSky;
uniform vec3 uBoat;
uniform vec2 uBoatDir;
uniform vec3 uWake[${WAKE_POINTS}];
uniform float uWakeStrength[${WAKE_POINTS}];
uniform int uWakeCount;
uniform float uWakeLife;
varying float vShore;
varying float vDense;
varying float vCrest;
varying vec2 vWorldXZ;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float wakeSegment(vec2 p, vec3 a, vec3 b, float sa, float sb) {
  float ageA = uTime - a.z;
  float ageB = uTime - b.z;
  if (ageB > uWakeLife || ageA < 0.0) return 0.0;
  vec2 ab = b.xy - a.xy;
  float len2 = dot(ab, ab);
  if (len2 > 40.0) return 0.0; // a gap (teleport or reset): no streak across the map
  float t = clamp(dot(p - a.xy, ab) / max(len2, 1e-4), 0.0, 1.0);
  vec2 q = a.xy + ab * t;
  float age = mix(ageA, ageB, t);
  float life = clamp(1.0 - age / uWakeLife, 0.0, 1.0);
  float width = 0.75 + age * 0.62;
  float d = distance(p, q);
  float strength = mix(sa, sb, t);
  return smoothstep(width, width * 0.3, d) * life * life * strength;
}
float wakeFoam(vec2 p) {
  // Early out far from the boat: the trail is at most a few dozen units long.
  if (distance(p, uBoat.xy) > 80.0) return 0.0;
  float foam = 0.0;
  for (int i = 1; i < ${WAKE_POINTS}; i++) {
    if (i >= uWakeCount) break;
    foam += wakeSegment(p, uWake[i - 1], uWake[i], uWakeStrength[i - 1], uWakeStrength[i]);
  }
  // Join the newest point to the stern, and the fresh wash right behind the propeller.
  if (uWakeCount > 0 && uBoat.z > 0.0) {
    int last = uWakeCount - 1;
    foam += wakeSegment(p, uWake[last], vec3(uBoat.xy, uTime), uWakeStrength[last], uBoat.z);
  }
  float dStern = distance(p, uBoat.xy);
  vec2 toP = p - uBoat.xy;
  float behind = clamp(-dot(normalize(toP + 1e-4), uBoatDir), 0.0, 1.0);
  foam += smoothstep(2.4, 0.3, dStern) * (0.4 + 0.6 * behind) * uBoat.z;
  return clamp(foam, 0.0, 1.0);
}
`;

const FRAGMENT_COLOR = /* glsl */ `
{
  float shoreT = smoothstep(0.0, 24.0, vShore);
  vec3 water = mix(uShallow, uDeep, shoreT);
  // Soft colour variation so the surface never reads as one flat tint.
  float n = vnoise(vWorldXZ * 0.08 + vec2(uTime * 0.05, -uTime * 0.03));
  float n2 = vnoise(vWorldXZ * 0.45 - vec2(uTime * 0.12, uTime * 0.09));
  water *= 0.9 + 0.2 * n;
  // Shore foam: bands drifting toward the land, broken by noise, gone on the land side (terrain covers it anyway).
  float band = 0.5 + 0.5 * sin(vShore * 2.4 - uTime * 1.6 + n * 4.0);
  float nearShore = smoothstep(4.5, 0.4, vShore) * smoothstep(-1.5, 0.3, vShore);
  float shoreFoam = nearShore * (0.25 + 0.75 * band) * (0.55 + 0.45 * n2);
  shoreFoam += smoothstep(1.2, 0.1, vShore) * smoothstep(-0.6, 0.1, vShore) * 0.5;
  // Whitecaps: only the very highest crests, only where the grid is dense enough to shape them (quality gated).
  float crest = smoothstep(0.78, 0.98, vCrest) * uWhitecaps * vDense * (0.3 + 0.7 * n2);
  float foam = clamp(shoreFoam + crest * 0.6 + wakeFoam(vWorldXZ), 0.0, 1.0);
  diffuseColor.rgb = mix(water, uFoam, foam * 0.85);
  diffuseColor.a = 1.0;
}
`;

const FRAGMENT_EMISSIVE = /* glsl */ `
{
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0), 4.0);
  totalEmissiveRadiance += uSky * fresnel * 0.1;
}
`;

export function createOceanMaterial(): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0.04 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, oceanUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>\n${VERTEX_NORMAL}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX_BEGIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT_COLOR}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${FRAGMENT_EMISSIVE}`);
  };
  mat.customProgramCacheKey = () => "pau-ocean";
  return mat;
}
