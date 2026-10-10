/**
 * Third-person follow camera maths. Frame-rate independent damping:
 * a = 1 - exp(-lambda * dt).
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
}

export const FOLLOW_CONFIG: FollowConfig = {
  distance: 13,
  height: 7,
  lookAhead: 3,
  speedPullBack: 0.12,
  positionLambda: 4.5,
  targetLambda: 7,
};

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
    target: { x: carX + fx * lead, y: 1.2, z: carZ + fz * lead },
  };
}
