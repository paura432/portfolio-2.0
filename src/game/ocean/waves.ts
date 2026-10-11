/**
 * Gerstner waves (V6). ONE table drives both the GPU (vertex displacement in
 * the water shader) and the CPU (buoyancy samples for the boat), so the hull
 * sits on the rendered surface instead of a different approximation of it.
 *
 * Gerstner displacement for a rest position (x, z) at time t:
 *   P.x = x + Σ Q_i·A_i·D_i.x·cos(θ_i)
 *   P.y =     Σ       A_i·sin(θ_i)
 *   P.z = z + Σ Q_i·A_i·D_i.z·cos(θ_i)
 *   θ_i = w_i·(D_i · (x, z)) + φ_i·t,  w_i = 2π / L_i,  φ_i = speed_i·w_i,
 *   Q_i = steepness_i / (w_i·A_i·N)   (Q·w·A ≤ 1 keeps the crests from looping)
 * (GPU Gems 1, ch. 1, "Effective Water Simulation from Physical Models").
 *
 * The GLSL below is generated from the same constants, and `waveUniforms()`
 * uploads the same numbers; `heightAt` inverts the horizontal displacement by
 * fixed-point iteration so it answers "how high is the water at world (x, z)".
 */
export interface GerstnerWave {
  /** Travel direction (normalised on use). */
  dir: [x: number, z: number];
  amplitude: number;
  wavelength: number;
  /** Phase speed in world units per second. */
  speed: number;
  /** 0 = sine wave, 1 = sharpest stable crest. */
  steepness: number;
}

export const WAVE_COUNT = 4;

/** Long swell from the north-west, two medium cross seas, one short ripple. Total amplitude ≈ 0.42 u. */
export const WAVES: readonly GerstnerWave[] = [
  { dir: [0.8, 0.6], amplitude: 0.2, wavelength: 26, speed: 4.2, steepness: 0.55 },
  { dir: [-0.35, 0.94], amplitude: 0.11, wavelength: 13, speed: 3.1, steepness: 0.5 },
  { dir: [0.95, -0.3], amplitude: 0.07, wavelength: 7.5, speed: 2.6, steepness: 0.45 },
  { dir: [0.2, -0.98], amplitude: 0.04, wavelength: 3.6, speed: 1.9, steepness: 0.35 },
];

/** Waves fade out over this distance from a coastline so the water never climbs a quay or a pier deck. */
export const SHORE_DAMP_DISTANCE = 10;

export function shoreDamp(coastDistance: number): number {
  const t = Math.max(0, Math.min(1, coastDistance / SHORE_DAMP_DISTANCE));
  return t * t * (3 - 2 * t);
}

interface Derived {
  dx: number;
  dz: number;
  amp: number;
  w: number;
  phi: number;
  q: number;
}

function derive(waves: readonly GerstnerWave[]): Derived[] {
  return waves.map((wv) => {
    const len = Math.hypot(wv.dir[0], wv.dir[1]) || 1;
    const w = (2 * Math.PI) / wv.wavelength;
    return {
      dx: wv.dir[0] / len,
      dz: wv.dir[1] / len,
      amp: wv.amplitude,
      w,
      phi: wv.speed * w,
      q: wv.amplitude > 0 ? wv.steepness / (w * wv.amplitude * waves.length) : 0,
    };
  });
}

const DERIVED = derive(WAVES);

export interface WaveSample {
  x: number;
  y: number;
  z: number;
}

/** Position of the surface point that rests at (x0, z0). `damp` scales the amplitude (1 = open sea). */
export function displace(x0: number, z0: number, t: number, damp = 1, waves: readonly Derived[] = DERIVED): WaveSample {
  let x = x0;
  let y = 0;
  let z = z0;
  for (const wv of waves) {
    const theta = wv.w * (wv.dx * x0 + wv.dz * z0) + wv.phi * t;
    const c = Math.cos(theta) * wv.q * wv.amp * damp;
    x += wv.dx * c;
    z += wv.dz * c;
    y += wv.amp * damp * Math.sin(theta);
  }
  return { x, y, z };
}

/**
 * Water height at world (x, z). Gerstner moves vertices sideways, so the rest
 * position that lands on (x, z) is found by three fixed-point iterations; with
 * our steepness the error is well below a millimetre.
 */
export function heightAt(x: number, z: number, t: number, damp = 1): number {
  let rx = x;
  let rz = z;
  for (let i = 0; i < 3; i++) {
    const p = displace(rx, rz, t, damp);
    rx += x - p.x;
    rz += z - p.z;
  }
  return displace(rx, rz, t, damp).y;
}

/** Shared clock: advanced once per frame by the ocean, read by everything that floats. */
export const oceanClock = { time: 0 };

/** Uniform values for the shader, from the same table. */
export function waveUniforms(waves: readonly GerstnerWave[] = WAVES) {
  const d = derive(waves);
  const pad = <T>(arr: T[], fill: T) => [...arr, ...Array.from({ length: WAVE_COUNT - arr.length }, () => fill)];
  return {
    uWaveDir: { value: pad(d.map((w) => [w.dx, w.dz] as [number, number]), [1, 0] as [number, number]) },
    uWaveAmp: { value: pad(d.map((w) => w.amp), 0) },
    uWaveFreq: { value: pad(d.map((w) => w.w), 1) },
    uWavePhase: { value: pad(d.map((w) => w.phi), 0) },
    uWaveQ: { value: pad(d.map((w) => w.q), 0) },
  };
}

/** GLSL: `gerstner(restXZ, t, damp)` returns (dx, y, dz) displacement; `gerstnerNormal` the surface normal. */
export const GERSTNER_GLSL = /* glsl */ `
#define WAVE_COUNT ${WAVE_COUNT}
uniform vec2 uWaveDir[WAVE_COUNT];
uniform float uWaveAmp[WAVE_COUNT];
uniform float uWaveFreq[WAVE_COUNT];
uniform float uWavePhase[WAVE_COUNT];
uniform float uWaveQ[WAVE_COUNT];

vec3 gerstner(vec2 p, float t, float damp) {
  vec3 d = vec3(0.0);
  for (int i = 0; i < WAVE_COUNT; i++) {
    float theta = uWaveFreq[i] * dot(uWaveDir[i], p) + uWavePhase[i] * t;
    float c = cos(theta) * uWaveQ[i] * uWaveAmp[i] * damp;
    d.x += uWaveDir[i].x * c;
    d.z += uWaveDir[i].y * c;
    d.y += uWaveAmp[i] * damp * sin(theta);
  }
  return d;
}

vec3 gerstnerNormal(vec2 p, float t, float damp) {
  // Analytic normal of the displaced surface (GPU Gems 1, eq. 12).
  vec3 n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < WAVE_COUNT; i++) {
    float theta = uWaveFreq[i] * dot(uWaveDir[i], p) + uWavePhase[i] * t;
    float wa = uWaveFreq[i] * uWaveAmp[i] * damp;
    float s = sin(theta);
    float c = cos(theta);
    n.x -= uWaveDir[i].x * wa * c;
    n.z -= uWaveDir[i].y * wa * c;
    n.y -= uWaveQ[i] * wa * s;
  }
  return normalize(n);
}
`;
