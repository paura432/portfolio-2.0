import type { DriveInput } from "../controls/input";

/**
 * Arcade car model. Pure function of (state, input, dt) so it is deterministic
 * and unit-testable. All units are world units and seconds.
 */
export interface CarState {
  x: number;
  z: number;
  /** Heading in radians; forward vector = (sin heading, 0, cos heading). */
  heading: number;
  /** Signed speed along the heading (negative = reversing). */
  speed: number;
  /** Visual steering angle of the front wheels, in radians. */
  steerAngle: number;
}

export interface CarConfig {
  maxSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  brakeDeceleration: number;
  /** Deceleration applied when there is no throttle. */
  rollingDeceleration: number;
  /** Turn rate at full speed, radians per second. */
  turnRate: number;
  /** Max visual steering angle. */
  maxSteerAngle: number;
  /** Longest simulated step; larger frame gaps are clamped (tab switch safety). */
  maxDt: number;
}

export const CAR_CONFIG: CarConfig = {
  maxSpeed: 20,
  maxReverseSpeed: 7,
  acceleration: 16,
  brakeDeceleration: 34,
  rollingDeceleration: 10,
  turnRate: 2.1,
  maxSteerAngle: 0.5,
  maxDt: 1 / 30,
};

export function createCarState(x: number, z: number, heading: number): CarState {
  return { x, z, heading, speed: 0, steerAngle: 0 };
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

export function forwardVector(heading: number): [x: number, z: number] {
  return [Math.sin(heading), Math.cos(heading)];
}

/** What the constraint learns about the sub-step that produced the proposed position. */
export interface StepInfo {
  /** Position before this sub-step. */
  prevX: number;
  prevZ: number;
  /** Signed speed along the heading during the sub-step. */
  speed: number;
  heading: number;
  /** Sub-step duration in seconds. */
  dt: number;
}

export interface ConstrainResult {
  x: number;
  z: number;
  /** True when a rigid obstacle or the boundary was hit: the car bumps back. */
  blocked: boolean;
  /**
   * Optional new speed when the car ploughed through something yielding (a tree
   * that gives way). Ignored when `blocked` is true.
   */
  speed?: number;
}

/**
 * Position constraint applied after every sub-step (collisions, boundaries).
 * The step info is optional so simple constraints `(x, z) => …` keep working.
 */
export type Constrain = (x: number, z: number, step?: StepInfo) => ConstrainResult;

/** Fraction of speed kept (and reversed) on a head-on blocked sub-step: a soft bump. */
export const BUMP_RESTITUTION = 0.2;
/** Contacts flatter than this (|forward · normal|) slide along the surface instead of bouncing back. */
export const HEAD_ON_DOT = 0.6;
/** Least fraction of the speed kept per sub-step while sliding along an obstacle. */
export const SLIDE_MIN = 0.3;
/** Scrape friction per sub-step, proportional to the normal component of the motion (|forward · normal|). */
export const SLIDE_FRICTION = 0.35;
/**
 * Steering authority a crawling car keeps while the throttle is held (fraction of the full turn rate).
 * V9: without it a car wedged between two rigid bodies never gains the speed it needs to turn out.
 */
export const LOW_SPEED_STEER = 0.35;

/**
 * Advance the car by `dt` seconds. Large `dt` values are split into sub-steps
 * so behaviour is identical at 30, 60 or 144 fps, and the constraint runs after
 * each sub-step so the car can never travel more than maxSpeed·maxDt (≈0.67 u)
 * into an obstacle before being pushed back out: no tunneling, no teleports.
 */
export function stepCar(
  state: CarState,
  input: DriveInput,
  dt: number,
  config: CarConfig = CAR_CONFIG,
  constrain?: Constrain,
): CarState {
  if (dt <= 0) return state;
  const clamped = Math.min(dt, config.maxDt * 3);
  const steps = Math.max(1, Math.ceil(clamped / config.maxDt));
  const h = clamped / steps;
  let s = state;
  for (let i = 0; i < steps; i++) {
    const prev = s;
    s = integrate(s, input, h, config);
    if (constrain) {
      const c = constrain(s.x, s.z, { prevX: prev.x, prevZ: prev.z, speed: s.speed, heading: s.heading, dt: h });
      if (c.blocked) s = { ...s, x: c.x, z: c.z, speed: bumpSpeed(s, c.x, c.z) };
      else if (c.speed !== undefined || c.x !== s.x || c.z !== s.z) s = { ...s, x: c.x, z: c.z, speed: c.speed ?? s.speed };
    }
  }
  return s;
}

/**
 * Speed after a blocked sub-step. The push-out direction (from the proposed
 * position to the resolved one) is the contact normal: a head-on contact
 * bounces back softly, a glancing one keeps most of the speed so the car
 * slides along the wall / kerb / trunk instead of stopping dead (V9).
 */
export function bumpSpeed(s: CarState, rx: number, rz: number): number {
  const px = rx - s.x;
  const pz = rz - s.z;
  const len = Math.hypot(px, pz);
  if (len < 1e-9) return -s.speed * BUMP_RESTITUTION;
  const [fx, fz] = forwardVector(s.heading);
  // Motion direction along the heading (reversing flips it); dot < 0 = moving into the obstacle.
  const dir = s.speed >= 0 ? 1 : -1;
  const dot = ((fx * px + fz * pz) / len) * dir;
  if (dot < -HEAD_ON_DOT) return -s.speed * BUMP_RESTITUTION;
  // Scraping along the surface: the push-out already removed the motion into it; a little friction per sub-step
  // (proportional to how hard the car presses) balances the throttle at a few u/s instead of stalling the car.
  return s.speed * Math.max(SLIDE_MIN, 1 - SLIDE_FRICTION * Math.abs(dot));
}

function integrate(s: CarState, input: DriveInput, dt: number, c: CarConfig): CarState {
  let speed = s.speed;
  const throttle = Math.max(-1, Math.min(1, input.throttle));

  if (input.brake) {
    speed = approach(speed, 0, c.brakeDeceleration * dt);
  } else if (throttle > 0) {
    speed = speed < 0 ? approach(speed, 0, c.brakeDeceleration * dt) : speed + c.acceleration * throttle * dt;
  } else if (throttle < 0) {
    speed = speed > 0 ? approach(speed, 0, c.brakeDeceleration * dt) : speed + c.acceleration * throttle * dt;
  } else {
    speed = approach(speed, 0, c.rollingDeceleration * dt);
  }
  speed = Math.max(-c.maxReverseSpeed, Math.min(c.maxSpeed, speed));

  const steer = Math.max(-1, Math.min(1, input.steer));
  const steerAngle = approach(s.steerAngle, -steer * c.maxSteerAngle, c.maxSteerAngle * 8 * dt);

  // Turn authority grows with speed and flips when reversing (like a real car). With the throttle held a
  // crawling car keeps a floor of authority (arcade pivot), so it can steer out of a tight spot (V9).
  const floor = throttle !== 0 ? LOW_SPEED_STEER * Math.abs(throttle) : 0;
  const speedFactor = Math.max(floor, Math.min(1, Math.abs(speed) / (c.maxSpeed * 0.45)));
  const direction = Math.abs(speed) > 0.05 ? (speed >= 0 ? 1 : -1) : throttle < 0 ? -1 : 1;
  const heading = s.heading - steer * c.turnRate * speedFactor * direction * dt;

  // Integrate displacement along the mid-step heading (midpoint rule) so the
  // path of a turning car matches across frame rates.
  const [fx, fz] = forwardVector((s.heading + heading) / 2);
  return {
    x: s.x + fx * speed * dt,
    z: s.z + fz * speed * dt,
    heading,
    speed,
    steerAngle,
  };
}
