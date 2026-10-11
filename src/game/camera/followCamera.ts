/**
 * Third-person follow camera maths. Frame-rate independent damping:
 * a = 1 - exp(-lambda * dt).
 *
 * Two framings exist: landscape (desktop) and portrait (phones). The active
 * config is a continuous blend by viewport aspect so resizing never jumps.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FollowConfig {
  distance: number;
  height: number;
  /** How far ahead of the car the camera looks, scaled by speed. */
  lookAhead: number;
  /** Extra pull-back per unit of speed. */
  speedPullBack: number;
  positionLambda: number;
  targetLambda: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Height of the look-at point. */
  targetHeight: number;
}

/** Desktop / landscape: close, low, cinematic; the car fills ~1/6 of the frame height. */
export const FOLLOW_CONFIG: FollowConfig = {
  distance: 12.5,
  height: 6.2,
  lookAhead: 3.5,
  speedPullBack: 0.12,
  positionLambda: 4.5,
  targetLambda: 7,
  fov: 52,
  targetHeight: 1.3,
};

/** Portrait phones: higher and farther with a wider lens so the road and the next block stay visible. */
export const FOLLOW_PORTRAIT: FollowConfig = {
  distance: 17,
  height: 10.5,
  lookAhead: 5,
  speedPullBack: 0.1,
  positionLambda: 4.5,
  targetLambda: 7,
  fov: 62,
  targetHeight: 1.0,
};

/**
 * Boat profile (V6): farther and higher so the horizon and the destination
 * island stay in frame, slower position damping so the swell never reaches the
 * camera undamped, a slightly wider lens for the open sea.
 */
export const BOAT_FOLLOW_CONFIG: FollowConfig = {
  distance: 16,
  height: 7.6,
  lookAhead: 4.5,
  speedPullBack: 0.2,
  positionLambda: 3.2,
  targetLambda: 5.5,
  fov: 54,
  targetHeight: 0.9,
};

export const BOAT_FOLLOW_PORTRAIT: FollowConfig = {
  distance: 21,
  height: 12.5,
  lookAhead: 6,
  speedPullBack: 0.16,
  positionLambda: 3.2,
  targetLambda: 5.5,
  fov: 64,
  targetHeight: 0.6,
};

/** Flight profile (V7): farther and higher, the horizon in frame, slower damping; the camera follows altitude 1:1. */
export const PLANE_FOLLOW_CONFIG: FollowConfig = {
  distance: 20,
  height: 7.5,
  lookAhead: 7,
  speedPullBack: 0.08,
  positionLambda: 3,
  targetLambda: 5,
  fov: 56,
  targetHeight: 1.0,
};

export const PLANE_FOLLOW_PORTRAIT: FollowConfig = {
  distance: 26,
  height: 11,
  lookAhead: 8,
  speedPullBack: 0.06,
  positionLambda: 3,
  targetLambda: 5,
  fov: 66,
  targetHeight: 0.8,
};

/** Transformation: the car profile pulled back and raised so the wings fit in frame. */
export const TRANSFORM_FOLLOW_CONFIG: FollowConfig = { ...FOLLOW_CONFIG, distance: FOLLOW_CONFIG.distance + 4, height: FOLLOW_CONFIG.height + 2, lookAhead: 0 };
export const TRANSFORM_FOLLOW_PORTRAIT: FollowConfig = { ...FOLLOW_PORTRAIT, distance: FOLLOW_PORTRAIT.distance + 4, height: FOLLOW_PORTRAIT.height + 2, lookAhead: 0 };

export type CameraVehicle = "car" | "boat" | "plane" | "transform";

/** Landscape/portrait pair for a vehicle (or the transformation framing). */
export function profilesFor(vehicle: CameraVehicle): { landscape: FollowConfig; portrait: FollowConfig } {
  switch (vehicle) {
    case "boat":
      return { landscape: BOAT_FOLLOW_CONFIG, portrait: BOAT_FOLLOW_PORTRAIT };
    case "plane":
      return { landscape: PLANE_FOLLOW_CONFIG, portrait: PLANE_FOLLOW_PORTRAIT };
    case "transform":
      return { landscape: TRANSFORM_FOLLOW_CONFIG, portrait: TRANSFORM_FOLLOW_PORTRAIT };
    default:
      return { landscape: FOLLOW_CONFIG, portrait: FOLLOW_PORTRAIT };
  }
}

/** Blend two configs (used for the continuous ground ⇄ flight framing by altitude). */
export function blendConfigs(a: FollowConfig, b: FollowConfig, t: number): FollowConfig {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    distance: lerp(a.distance, b.distance, t),
    height: lerp(a.height, b.height, t),
    lookAhead: lerp(a.lookAhead, b.lookAhead, t),
    speedPullBack: lerp(a.speedPullBack, b.speedPullBack, t),
    positionLambda: lerp(a.positionLambda, b.positionLambda, t),
    targetLambda: lerp(a.targetLambda, b.targetLambda, t),
    fov: lerp(a.fov, b.fov, t),
    targetHeight: lerp(a.targetHeight, b.targetHeight, t),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blend factor: 0 at aspect ≥ 1.15 (landscape), 1 at aspect ≤ 0.7 (portrait). */
export function portraitFactor(aspect: number): number {
  return Math.max(0, Math.min(1, (1.15 - aspect) / 0.45));
}

export function configForAspect(aspect: number, landscape = FOLLOW_CONFIG, portrait = FOLLOW_PORTRAIT): FollowConfig {
  const t = portraitFactor(aspect);
  if (t <= 0) return landscape;
  if (t >= 1) return portrait;
  return {
    distance: lerp(landscape.distance, portrait.distance, t),
    height: lerp(landscape.height, portrait.height, t),
    lookAhead: lerp(landscape.lookAhead, portrait.lookAhead, t),
    speedPullBack: lerp(landscape.speedPullBack, portrait.speedPullBack, t),
    positionLambda: landscape.positionLambda,
    targetLambda: landscape.targetLambda,
    fov: lerp(landscape.fov, portrait.fov, t),
    targetHeight: lerp(landscape.targetHeight, portrait.targetHeight, t),
  };
}

export function dampFactor(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * dampFactor(lambda, dt);
}

/** How much of the vehicle's vertical motion (a boat on the swell) reaches the camera position. */
export const SWELL_TO_CAMERA = 0.35;

export function desiredCamera(
  carX: number,
  carZ: number,
  heading: number,
  speed: number,
  c: FollowConfig = FOLLOW_CONFIG,
  /** Vehicle height above the ground plane (0 for the car; the boat's buoyancy height; the aircraft's altitude). */
  baseY = 0,
  /** Fraction of `baseY` that reaches the camera position (swell damping for the boat; 1 for the aircraft). */
  yFollow = SWELL_TO_CAMERA,
  /** Nose pitch: the look-at point follows the nose up and down (aircraft only). */
  pitch = 0,
): { position: Vec3; target: Vec3 } {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const speedAbs = Math.abs(speed);
  const dist = c.distance + speedAbs * c.speedPullBack;
  const lead = c.lookAhead * Math.min(1, speedAbs / 10);
  return {
    position: { x: carX - fx * dist, y: c.height + speedAbs * 0.05 + baseY * yFollow, z: carZ - fz * dist },
    target: { x: carX + fx * lead, y: c.targetHeight + baseY + Math.sin(pitch) * lead, z: carZ + fz * lead },
  };
}
