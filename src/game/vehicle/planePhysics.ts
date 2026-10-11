import type { DriveInput } from "../controls/input";

/**
 * PAU AERO-X arcade flight model (V7). Pure function of (state, input, dt),
 * deterministic and unit-testable like the car and the boat.
 *
 * Controls (the same four actions as every vehicle):
 *   W / ▲  on the ground: throttle (run-up);  in the air: climb (nose up, a little more thrust)
 *   S / ▼  on the ground: brake;              in the air: descend (nose down)
 *   A / D  bank → the aircraft turns through its bank (coordinated turn); on the ground: steer
 *   Space  brake on the ground; air brake in the air
 *
 * The speed self-regulates toward a cruise value (auto-throttle), climbing
 * bleeds speed and diving gains it; below the stall speed the nose drops
 * progressively and height is lost, never a chaotic tumble.
 */
export interface PlaneState {
  x: number;
  /** Altitude of the hull reference point (ground contact height on the runway). */
  y: number;
  z: number;
  /** Yaw in radians; forward on the ground = (sin heading, 0, cos heading). */
  heading: number;
  /** Nose-up positive. */
  pitch: number;
  /** Bank: positive = left wing down (turns left). */
  roll: number;
  /** Airspeed along the nose (u/s). */
  speed: number;
  onGround: boolean;
  /** Smoothed throttle 0..1 for the thruster visuals. */
  throttle: number;
  /** True while the stall rule is pushing the nose down. */
  stalled: boolean;
}

export interface PlaneConfig {
  /** Run-up acceleration on the ground. */
  groundAccel: number;
  groundBrake: number;
  /** Rolling resistance on the ground when coasting. */
  groundDrag: number;
  /** Ground steering yaw rate at full authority. */
  groundTurnRate: number;
  /** Speed at which the nose rotates and the wheels leave the runway. */
  takeoffSpeed: number;
  rotationPitch: number;
  /** Auto-throttle target in level flight; W adds `climbThrust`, Space subtracts `airBrake`. */
  cruiseSpeed: number;
  climbThrust: number;
  airBrake: number;
  maxSpeed: number;
  /** Below this the stall rule applies. */
  stallSpeed: number;
  /** How fast the speed converges on its target (per second). */
  speedLambda: number;
  /** Speed lost per second per unit of sin(pitch) (climbing bleeds, diving gains). */
  gravityAlongPath: number;
  maxClimbPitch: number;
  maxDivePitch: number;
  pitchRate: number;
  /** Auto-level of the pitch with no input (per second). */
  pitchLevelLambda: number;
  maxRoll: number;
  rollRate: number;
  rollLevelLambda: number;
  /** Yaw rate at full bank and cruise speed. */
  turnRate: number;
  /** Extra sink speed (u/s) at zero airspeed in a stall. */
  stallSink: number;
  /** Nose-down pitch the stall rule drives toward. */
  stallPitch: number;
  /** Ceiling: the nose is levelled when reached. */
  maxAltitude: number;
  throttleLambda: number;
  maxDt: number;
}

export const PLANE_CONFIG: PlaneConfig = {
  groundAccel: 8,
  groundBrake: 11,
  groundDrag: 2.2,
  groundTurnRate: 0.9,
  takeoffSpeed: 15,
  rotationPitch: 0.22,
  cruiseSpeed: 24,
  climbThrust: 5,
  airBrake: 9,
  maxSpeed: 34,
  stallSpeed: 11,
  speedLambda: 0.55,
  gravityAlongPath: 7,
  maxClimbPitch: 0.42,
  maxDivePitch: -0.5,
  pitchRate: 1.1,
  pitchLevelLambda: 1.4,
  maxRoll: 0.85,
  rollRate: 2.2,
  rollLevelLambda: 2.4,
  turnRate: 1.0,
  stallSink: 6,
  stallPitch: -0.3,
  maxAltitude: 95,
  throttleLambda: 4,
  maxDt: 1 / 30,
};

export function createPlaneState(x: number, y: number, z: number, heading: number): PlaneState {
  return { x, y, z, heading, pitch: 0, roll: 0, speed: 0, onGround: true, throttle: 0, stalled: false };
}

/** Forward unit vector of the nose. */
export function noseVector(heading: number, pitch: number): [x: number, y: number, z: number] {
  const c = Math.cos(pitch);
  return [Math.sin(heading) * c, Math.sin(pitch), Math.cos(heading) * c];
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

function dampTo(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * What the world tells the aircraft each sub-step: the ground height under it
 * (the runway's, or the terrain's), whether this spot allows a touchdown, and
 * the lowest altitude allowed here when it is not a landing spot (so the hull
 * never clips buildings or the sea outside a runway).
 */
export interface Terrain {
  groundY: number;
  canLand: boolean;
  floorY: number;
}

export type TerrainQuery = (x: number, z: number) => Terrain;

export interface PlaneStepResult {
  state: PlaneState;
  /** The wheels touched a valid runway this step. */
  touchedDown: boolean;
  /** The aircraft was held up by the altitude floor this step (not a landing spot). */
  floorHit: boolean;
  /** The wheels left the ground this step. */
  liftedOff: boolean;
}

export function stepPlane(state: PlaneState, input: DriveInput, dt: number, terrain: TerrainQuery, config: PlaneConfig = PLANE_CONFIG): PlaneStepResult {
  if (dt <= 0) return { state, touchedDown: false, floorHit: false, liftedOff: false };
  const clamped = Math.min(dt, config.maxDt * 3);
  const steps = Math.max(1, Math.ceil(clamped / config.maxDt));
  const h = clamped / steps;
  let s = state;
  let touchedDown = false;
  let floorHit = false;
  let liftedOff = false;
  for (let i = 0; i < steps; i++) {
    const r = s.onGround ? groundStep(s, input, h, terrain, config) : airStep(s, input, h, terrain, config);
    s = r.state;
    touchedDown ||= r.touchedDown;
    floorHit ||= r.floorHit;
    liftedOff ||= r.liftedOff;
  }
  return { state: s, touchedDown, floorHit, liftedOff };
}

function groundStep(s: PlaneState, input: DriveInput, dt: number, terrain: TerrainQuery, c: PlaneConfig): PlaneStepResult {
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  let speed = s.speed;
  if (input.brake || throttle < 0) speed = approach(speed, 0, c.groundBrake * dt);
  else if (throttle > 0) speed = Math.min(c.maxSpeed, speed + c.groundAccel * throttle * dt);
  else speed = approach(speed, 0, c.groundDrag * dt);
  speed = Math.max(0, speed);

  const steer = Math.max(-1, Math.min(1, input.steer));
  const authority = Math.min(1, speed / 8);
  const heading = s.heading - steer * c.groundTurnRate * authority * dt;

  // Rotation: past the takeoff speed with the throttle open the nose lifts; once it is up, the wheels leave the ground.
  const rotating = throttle > 0 && speed >= c.takeoffSpeed;
  const pitch = rotating ? approach(s.pitch, c.rotationPitch, c.pitchRate * dt) : approach(s.pitch, 0, c.pitchRate * dt);
  const roll = dampTo(s.roll, 0, c.rollLevelLambda, dt);

  const x = s.x + Math.sin(heading) * speed * dt;
  const z = s.z + Math.cos(heading) * speed * dt;
  const t = terrain(x, z);
  const liftedOff = rotating && pitch >= c.rotationPitch - 1e-6;
  const next: PlaneState = {
    ...s,
    x,
    z,
    y: t.groundY,
    heading,
    pitch,
    roll,
    speed,
    onGround: !liftedOff,
    throttle: dampTo(s.throttle, throttle > 0 ? throttle : 0, c.throttleLambda, dt),
    stalled: false,
  };
  if (liftedOff) next.y = t.groundY + 0.05;
  return { state: next, touchedDown: false, floorHit: false, liftedOff };
}

function airStep(s: PlaneState, input: DriveInput, dt: number, terrain: TerrainQuery, c: PlaneConfig): PlaneStepResult {
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  const steer = Math.max(-1, Math.min(1, input.steer));

  // Speed: auto-throttle toward cruise (+climb thrust with W, −air brake with Space), gravity along the path.
  const target = c.cruiseSpeed + (throttle > 0 ? c.climbThrust * throttle : 0) - (input.brake ? c.airBrake : 0);
  let speed = dampTo(s.speed, target, c.speedLambda, dt);
  speed -= Math.sin(s.pitch) * c.gravityAlongPath * dt;
  speed = Math.max(0, Math.min(c.maxSpeed, speed));

  // Pitch: W climbs, S descends, otherwise it levels; a stall drives the nose down instead.
  const stalled = speed < c.stallSpeed;
  let pitchTarget = throttle > 0 ? c.maxClimbPitch * throttle : throttle < 0 ? c.maxDivePitch * -throttle : 0;
  if (stalled) pitchTarget = Math.min(pitchTarget, c.stallPitch);
  if (s.y >= c.maxAltitude && pitchTarget > 0) pitchTarget = 0;
  const pitch = throttle === 0 && !stalled ? dampTo(s.pitch, 0, c.pitchLevelLambda, dt) : approach(s.pitch, pitchTarget, c.pitchRate * dt);

  // Bank and the turn it produces.
  const rollTarget = -steer * c.maxRoll;
  const roll = steer === 0 ? dampTo(s.roll, 0, c.rollLevelLambda, dt) : approach(s.roll, rollTarget, c.rollRate * dt);
  const authority = Math.min(1, speed / c.cruiseSpeed);
  const heading = s.heading + Math.sin(roll) * c.turnRate * authority * dt;

  const [fx, fy, fz] = noseVector(heading, pitch);
  const x = s.x + fx * speed * dt;
  let y = s.y + fy * speed * dt;
  const z = s.z + fz * speed * dt;
  // Stall sink: the lower the speed, the faster the height goes.
  if (stalled) y -= c.stallSink * (1 - speed / c.stallSpeed) * dt;
  if (y > c.maxAltitude) y = c.maxAltitude;

  const t = terrain(x, z);
  let touchedDown = false;
  let floorHit = false;
  let onGround = false;
  if (t.canLand && y <= t.groundY + 0.02) {
    // Touchdown: wheels on a runway, whatever the attitude; the roll-out is the ground model's business.
    y = t.groundY;
    onGround = true;
    touchedDown = true;
  } else if (!t.canLand && y < t.floorY) {
    // Not a landing spot: held up at the floor, nose levelled a little.
    y = t.floorY;
    floorHit = true;
  }
  const next: PlaneState = {
    x,
    y,
    z,
    heading,
    pitch: onGround ? Math.min(pitch, 0.1) : pitch,
    roll: onGround ? roll * 0.5 : roll,
    speed,
    onGround,
    throttle: dampTo(s.throttle, Math.max(0, throttle), c.throttleLambda, dt),
    stalled,
  };
  return { state: next, touchedDown, floorHit, liftedOff: false };
}

/** Altitude above the local ground, for the HUD. */
export function altitudeAbove(state: PlaneState, groundY: number): number {
  return Math.max(0, state.y - groundY);
}
