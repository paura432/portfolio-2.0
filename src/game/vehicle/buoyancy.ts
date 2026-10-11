/**
 * Point-sampled buoyancy (V6). Five hull points are dropped onto the water
 * surface; the hull's height, pitch and roll are read off the plane through
 * them. Pure maths over a height sampler so the tests can use any surface.
 * Horizontal motion is untouched: the physics stays 2D, this is the visual
 * layer that makes the hull ride the waves.
 */
export interface HullLayout {
  /** Half beam (lateral offset of the side samples). */
  halfWidth: number;
  /** Longitudinal offset of the bow samples (+ forward). */
  bow: number;
  /** Longitudinal offset of the stern samples (negative). */
  stern: number;
}

export const HULL: HullLayout = { halfWidth: 1.05, bow: 2.3, stern: -1.9 };

export interface FloatPose {
  /** Water height under the hull centre (mean of the five samples). */
  y: number;
  /** Nose-up positive (rotation about the hull's lateral axis). */
  pitch: number;
  /** Starboard-down positive (rotation about the hull's longitudinal axis). */
  roll: number;
}

export type HeightSampler = (x: number, z: number) => number;

/** Fit the hull to the surface: y from the mean, pitch from bow–stern, roll from port–starboard. */
export function floatPose(x: number, z: number, heading: number, sample: HeightSampler, hull: HullLayout = HULL): FloatPose {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const lx = Math.cos(heading);
  const lz = -Math.sin(heading);
  const at = (forward: number, lateral: number) => sample(x + fx * forward + lx * lateral, z + fz * forward + lz * lateral);
  const bowL = at(hull.bow, -hull.halfWidth);
  const bowR = at(hull.bow, hull.halfWidth);
  const sternL = at(hull.stern, -hull.halfWidth);
  const sternR = at(hull.stern, hull.halfWidth);
  const centre = at(0, 0);
  const y = (bowL + bowR + sternL + sternR + centre) / 5;
  const bow = (bowL + bowR) / 2;
  const stern = (sternL + sternR) / 2;
  const left = (bowL + sternL) / 2;
  const right = (bowR + sternR) / 2;
  return {
    y,
    pitch: Math.atan2(bow - stern, hull.bow - hull.stern),
    roll: Math.atan2(right - left, hull.halfWidth * 2),
  };
}

export const FLOAT_VISUAL = {
  /** Damping of the pose toward the sampled one (per second); low enough to feel like mass. */
  heightLambda: 6,
  angleLambda: 5,
  /** Planing: the bow lifts with throttle and speed (radians at full speed). */
  bowLiftMax: 0.09,
  /** Roll into a turn (radians at full rudder and full speed). */
  turnRollMax: 0.12,
  /** Hull sits this far above the water surface at rest (draft is already in the model). */
  freeboard: 0.05,
} as const;

/** Extra pitch from planing: 0 at rest, `bowLiftMax` at full forward speed. */
export function planingPitch(forwardSpeed: number, throttle: number, maxSpeed: number, cfg = FLOAT_VISUAL): number {
  const v = Math.max(0, forwardSpeed) / maxSpeed;
  return cfg.bowLiftMax * Math.min(1, v * 1.4) * (0.5 + 0.5 * throttle);
}

/** Roll into the turn (hull leans inward like a real planing boat). */
export function turnRoll(forwardSpeed: number, rudder: number, maxSpeed: number, cfg = FLOAT_VISUAL): number {
  const v = Math.min(1, Math.abs(forwardSpeed) / maxSpeed);
  return cfg.turnRollMax * rudder * v;
}

export function dampTo(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
