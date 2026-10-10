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

export function desiredCamera(
  carX: number,
  carZ: number,
  heading: number,
  speed: number,
  c: FollowConfig = FOLLOW_CONFIG,
): { position: Vec3; target: Vec3 } {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const speedAbs = Math.abs(speed);
  const dist = c.distance + speedAbs * c.speedPullBack;
  const lead = c.lookAhead * Math.min(1, speedAbs / 10);
  return {
    position: { x: carX - fx * dist, y: c.height + speedAbs * 0.05, z: carZ - fz * dist },
    target: { x: carX + fx * lead, y: c.targetHeight, z: carZ + fz * lead },
  };
}
