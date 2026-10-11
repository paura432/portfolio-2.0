import type { DriveInput } from "../controls/input";
import type { Constrain } from "./carPhysics";

/**
 * Arcade boat model (V6). Pure function of (state, input, dt), deterministic
 * and unit-testable, like the car. Unlike the car the boat has a velocity
 * vector: thrust pushes along the heading, hydrodynamic drag slows the hull
 * progressively, and turning sheds some forward speed into a sideways slip
 * that decays on its own, so the hull drifts through fast turns and keeps
 * gliding after the throttle is released.
 */
export interface BoatState {
  x: number;
  z: number;
  /** Heading in radians; forward vector = (sin heading, 0, cos heading). */
  heading: number;
  /** World-space velocity. */
  vx: number;
  vz: number;
  /** Yaw rate in radians per second (smoothed rudder response). */
  yawRate: number;
  /** Smoothed throttle 0..1 (engine/wake visuals) and rudder -1..1 (visual roll). */
  throttle: number;
  rudder: number;
  /** Impulse of the last collision this step (0 when none); cosmetic jolt. */
  bump: number;
}

export interface BoatConfig {
  maxSpeed: number;
  maxReverseSpeed: number;
  /** Forward thrust acceleration at full throttle (u/s²). */
  thrust: number;
  reverseThrust: number;
  /** Braking (opposite throttle while moving, or the brake key). */
  brakeDeceleration: number;
  /** Drag: linear + quadratic terms on the forward speed. Terminal speed solves thrust = a·v + b·v². */
  dragLinear: number;
  dragQuadratic: number;
  /** Decay rate of the sideways slip (per second). */
  lateralDrag: number;
  /** Fraction of forward speed shed sideways per radian of turn. */
  drift: number;
  /** Yaw rate at full rudder authority (rad/s). */
  turnRate: number;
  /** Forward speed at which the rudder has full authority. */
  turnSpeedRef: number;
  /** Rudder authority available from the propeller wash while accelerating from rest. */
  idleTurnAuthority: number;
  yawLambda: number;
  throttleLambda: number;
  rudderLambda: number;
  /** Fraction of the velocity into a wall that bounces back on contact. */
  restitution: number;
  maxDt: number;
}

export const BOAT_CONFIG: BoatConfig = {
  maxSpeed: 16,
  maxReverseSpeed: 4,
  thrust: 7.5,
  reverseThrust: 3,
  brakeDeceleration: 9,
  dragLinear: 0.22,
  dragQuadratic: 0.016,
  lateralDrag: 1.6,
  drift: 0.38,
  turnRate: 1.15,
  turnSpeedRef: 7,
  idleTurnAuthority: 0.25,
  yawLambda: 4.5,
  throttleLambda: 3.5,
  rudderLambda: 5,
  restitution: 0.3,
  maxDt: 1 / 30,
};

export function createBoatState(x: number, z: number, heading: number): BoatState {
  return { x, z, heading, vx: 0, vz: 0, yawRate: 0, throttle: 0, rudder: 0, bump: 0 };
}

/** Signed forward speed (along the heading). */
export function forwardSpeed(s: BoatState): number {
  return s.vx * Math.sin(s.heading) + s.vz * Math.cos(s.heading);
}

/** Sideways slip speed (positive to starboard). */
export function lateralSpeed(s: BoatState): number {
  return s.vx * Math.cos(s.heading) - s.vz * Math.sin(s.heading);
}

export function boatSpeed(s: BoatState): number {
  return Math.hypot(s.vx, s.vz);
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

function dampTo(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * Advance the boat by `dt` seconds in sub-steps (frame-rate independent). The
 * constraint runs after every sub-step; on contact the velocity into the wall
 * is removed (a small fraction bounces back) and `bump` records the impulse.
 */
export function stepBoat(state: BoatState, input: DriveInput, dt: number, config: BoatConfig = BOAT_CONFIG, constrain?: Constrain): BoatState {
  if (dt <= 0) return state;
  const clamped = Math.min(dt, config.maxDt * 3);
  const steps = Math.max(1, Math.ceil(clamped / config.maxDt));
  const h = clamped / steps;
  let s: BoatState = { ...state, bump: 0 };
  for (let i = 0; i < steps; i++) {
    const prev = s;
    s = integrate(s, input, h, config);
    if (!constrain) continue;
    const c = constrain(s.x, s.z, { prevX: prev.x, prevZ: prev.z, speed: forwardSpeed(s), heading: s.heading, dt: h });
    if (!c.blocked) {
      if (c.x !== s.x || c.z !== s.z) s = { ...s, x: c.x, z: c.z };
      continue;
    }
    // Contact normal: the direction the constraint pushed the hull.
    let nx = c.x - s.x;
    let nz = c.z - s.z;
    const len = Math.hypot(nx, nz);
    if (len > 1e-6) {
      nx /= len;
      nz /= len;
    } else {
      // Pushed nowhere (e.g. a boundary clamp on one axis): fall back to the reverse of the motion.
      const mx = s.x - prev.x;
      const mz = s.z - prev.z;
      const ml = Math.hypot(mx, mz) || 1;
      nx = -mx / ml;
      nz = -mz / ml;
    }
    const vn = s.vx * nx + s.vz * nz;
    const into = vn < 0 ? -vn : 0;
    s = {
      ...s,
      x: c.x,
      z: c.z,
      vx: vn < 0 ? s.vx - vn * nx * (1 + config.restitution) : s.vx,
      vz: vn < 0 ? s.vz - vn * nz * (1 + config.restitution) : s.vz,
      yawRate: s.yawRate * 0.5,
      bump: Math.max(s.bump, into),
    };
  }
  return s;
}

function integrate(s: BoatState, input: DriveInput, dt: number, c: BoatConfig): BoatState {
  const fx = Math.sin(s.heading);
  const fz = Math.cos(s.heading);
  const lx = Math.cos(s.heading);
  const lz = -Math.sin(s.heading);
  let vf = s.vx * fx + s.vz * fz;
  let vl = s.vx * lx + s.vz * lz;

  const throttleIn = Math.max(-1, Math.min(1, input.throttle));
  if (input.brake) {
    vf = approach(vf, 0, c.brakeDeceleration * dt);
  } else if (throttleIn > 0) {
    vf = vf < -0.3 ? approach(vf, 0, c.brakeDeceleration * dt) : vf + c.thrust * throttleIn * dt;
  } else if (throttleIn < 0) {
    vf = vf > 0.3 ? approach(vf, 0, c.brakeDeceleration * dt) : vf + c.reverseThrust * throttleIn * dt;
  }
  // Hydrodynamic drag: never instant, never a hard stop.
  const drag = (c.dragLinear * vf + c.dragQuadratic * vf * Math.abs(vf)) * dt;
  vf = Math.abs(drag) >= Math.abs(vf) ? 0 : vf - drag;
  vf = Math.max(-c.maxReverseSpeed, Math.min(c.maxSpeed, vf));
  vl *= Math.exp(-c.lateralDrag * dt);

  // Rudder: authority grows with speed; propeller wash gives a little at rest while accelerating.
  const steer = Math.max(-1, Math.min(1, input.steer));
  const pushing = throttleIn > 0 && !input.brake;
  const authority = Math.max(Math.min(1, Math.abs(vf) / c.turnSpeedRef), pushing ? c.idleTurnAuthority : 0);
  const direction = vf >= -0.2 ? 1 : -1;
  const yawTarget = -steer * c.turnRate * authority * direction;
  const yawRate = dampTo(s.yawRate, yawTarget, c.yawLambda, dt);
  const heading = s.heading + yawRate * dt;
  // Drift: a turning hull sheds forward speed sideways (felt as a slide through fast turns).
  vl += -yawRate * vf * c.drift * dt;

  const nfx = Math.sin(heading);
  const nfz = Math.cos(heading);
  const nlx = Math.cos(heading);
  const nlz = -Math.sin(heading);
  const vx = nfx * vf + nlx * vl;
  const vz = nfz * vf + nlz * vl;
  return {
    x: s.x + vx * dt,
    z: s.z + vz * dt,
    heading,
    vx,
    vz,
    yawRate,
    throttle: dampTo(s.throttle, pushing ? throttleIn : 0, c.throttleLambda, dt),
    rudder: dampTo(s.rudder, steer, c.rudderLambda, dt),
    bump: s.bump,
  };
}

/** Terminal forward speed for a thrust against the drag model (used by tests and the HUD scale). */
export function terminalSpeed(c: BoatConfig = BOAT_CONFIG): number {
  const a = c.dragQuadratic;
  const b = c.dragLinear;
  const v = (-b + Math.sqrt(b * b + 4 * a * c.thrust)) / (2 * a);
  return Math.min(c.maxSpeed, v);
}
