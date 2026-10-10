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

/**
 * Advance the car by `dt` seconds. Large `dt` values are split into sub-steps
 * so behaviour is identical at 30, 60 or 144 fps.
 */
export function stepCar(
  state: CarState,
  input: DriveInput,
  dt: number,
  config: CarConfig = CAR_CONFIG,
): CarState {
  if (dt <= 0) return state;
  const clamped = Math.min(dt, config.maxDt * 3);
  const steps = Math.max(1, Math.ceil(clamped / config.maxDt));
  const h = clamped / steps;
  let s = state;
  for (let i = 0; i < steps; i++) s = integrate(s, input, h, config);
  return s;
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

  // Turn authority grows with speed and flips when reversing (like a real car).
  const speedFactor = Math.min(1, Math.abs(speed) / (c.maxSpeed * 0.45));
  const direction = speed >= 0 ? 1 : -1;
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
