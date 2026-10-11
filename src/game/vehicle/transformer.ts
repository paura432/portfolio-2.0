/**
 * PAU TRANSFORMER-X (V8): one vehicle, three bodies. This module is the pure
 * rule set of the transformable vehicle: the explicit state machine, which
 * physics model owns the position in each state, when a ramp or a beach may
 * start a transformation (with hysteresis so waves and lip bounces never flap
 * the form back and forth), and the hand-over maths between the car, boat
 * and flight models. No Three.js, no store: everything here is unit-tested.
 */
export type VehicleState =
  | "car"
  | "preparing-flight"
  | "transforming-to-plane"
  | "flying"
  | "landing"
  | "transforming-to-car"
  | "transforming-to-boat"
  | "floating"
  | "exiting-water";

/** Which physics model integrates the position. Exactly one at a time. */
export type Authority = "car" | "boat" | "plane";

/** What the HUD calls the current body. */
export type BodyMode = "car" | "boat" | "plane";

export function authorityOf(state: VehicleState): Authority {
  switch (state) {
    case "flying":
      return "plane";
    case "transforming-to-boat":
    case "floating":
      return "boat";
    default:
      return "car";
  }
}

export function bodyModeOf(state: VehicleState): BodyMode {
  switch (state) {
    case "transforming-to-plane":
    case "flying":
    case "landing":
      return "plane";
    case "transforming-to-boat":
    case "floating":
      return "boat";
    default:
      return "car";
  }
}

export const TRANSFORMING: ReadonlySet<VehicleState> = new Set(["transforming-to-plane", "transforming-to-car", "transforming-to-boat", "exiting-water"]);

/** Seconds. Inside the brief's 1.5–2.5 s budget for the wings; the sea change is quicker (the hull is mostly already there). */
export const DURATION = {
  "transforming-to-plane": 1.7,
  "transforming-to-car": 1.5,
  "transforming-to-boat": 1.1,
  "exiting-water": 1.2,
} as const;

/** Speeds in u/s. The wings may start to deploy from `DEPLOY_SPEED`; the lip only launches a flight from `TAKEOFF_SPEED`. */
export const DEPLOY_SPEED = 11;
export const TAKEOFF_SPEED = 14;
/** Heading tolerance to the ramp's direction (radians) for the corridor to count. */
export const RAMP_ALIGN = 0.45;

/** Hysteresis on the water depth (water above the sand, u): enter the sea deeper than you leave it. */
export const BOAT_ENTER_DEPTH = 0.55;
export const BOAT_EXIT_DEPTH = 0.3;
/** After a transformation completes, none may start for this long (seconds). */
export const LOCKOUT = 1.0;
/** Speed a hull must have toward the sea (or the land) for the depth rule to fire, u/s. */
export const SHORE_DIRECTION_SPEED = 0.6;

/** Arcade gravity for the car's hops (u/s²) and the ground speed a landing keeps for its roll-out. */
export const HOP_GRAVITY = 22;
export const LANDING_ROLL_SPEED = 16;

/** Allowed transitions: the only edges of the state machine. */
const EDGES: Record<VehicleState, readonly VehicleState[]> = {
  car: ["preparing-flight", "transforming-to-boat"],
  "preparing-flight": ["car", "transforming-to-plane", "transforming-to-boat"],
  "transforming-to-plane": ["flying", "transforming-to-car"],
  flying: ["landing", "transforming-to-boat"],
  landing: ["transforming-to-car", "transforming-to-boat"],
  "transforming-to-car": ["car", "transforming-to-boat"],
  "transforming-to-boat": ["floating", "exiting-water"],
  floating: ["exiting-water"],
  "exiting-water": ["car", "transforming-to-boat"],
};

export function canTransition(from: VehicleState, to: VehicleState): boolean {
  return EDGES[from].includes(to);
}

/** Two transformations never run at once; a running one may only be reversed or completed. */
export function isTransforming(state: VehicleState): boolean {
  return TRANSFORMING.has(state);
}

export interface RampContext {
  state: VehicleState;
  /** The car is inside a ramp corridor (approach or slope). */
  inCorridor: boolean;
  /** Heading within `RAMP_ALIGN` of the ramp's direction and moving forward. */
  aligned: boolean;
  /** Signed ground speed (u/s). */
  speed: number;
  /** The car has just driven past the lip this step. */
  pastLip: boolean;
  /** Wings fully deployed. */
  deployed: boolean;
  /** Seconds since the last transformation completed. */
  sinceLast: number;
}

export type RampDecision = "prepare" | "deploy" | "abort" | "launch" | "hop" | "clear" | null;

/**
 * What the ramp does to the state this step. "prepare" and "deploy" start
 * sequences, "abort" folds the wings back (too slow, wrong way, left the
 * corridor), "launch" hands over to flight at the lip, "hop" is a lip
 * crossing without a valid takeoff (the car just jumps), "clear" leaves the
 * preparing state when the corridor is gone.
 */
export function rampDecision(c: RampContext): RampDecision {
  const { state } = c;
  if (c.pastLip) {
    if (state === "transforming-to-plane" && c.deployed && c.speed >= TAKEOFF_SPEED) return "launch";
    if (state === "transforming-to-plane") return "abort";
    return state === "car" || state === "preparing-flight" ? "hop" : null;
  }
  if (state === "car") {
    if (c.inCorridor && c.aligned && c.sinceLast >= LOCKOUT) return "prepare";
    return null;
  }
  if (state === "preparing-flight") {
    if (!c.inCorridor || !c.aligned) return "clear";
    if (c.speed >= DEPLOY_SPEED) return "deploy";
    return null;
  }
  if (state === "transforming-to-plane") {
    // Slowing down, reversing, turning away or leaving the corridor before the lip: fold back.
    if (!c.inCorridor || !c.aligned || c.speed < DEPLOY_SPEED * 0.7) return "abort";
    return null;
  }
  return null;
}

export interface ShoreContext {
  state: VehicleState;
  /** Water above the ground under the hull (u). */
  depth: number;
  /** Velocity component toward deeper water, along the ground's downhill direction (u/s; negative = toward the land). */
  seawardSpeed: number;
  /** On a shore: ground sloping between the land and the sea floor (V9: derived from the height field, not from a beach list). */
  onShore: boolean;
  sinceLast: number;
}

export type ShoreDecision = "to-boat" | "to-car" | null;

/**
 * Shore rule with hysteresis: a car (or a car-form in any ground state)
 * heading into water deeper than `BOAT_ENTER_DEPTH` becomes a boat; a boat
 * heading toward the land into water shallower than `BOAT_EXIT_DEPTH`
 * becomes a car. Between the two depths nothing changes, so a hull rocking
 * at the waterline or a car on wet sand keeps its form. A sequence in
 * progress may only be reversed when the depth crosses the *other*
 * threshold (the shore demanded it), never re-started. The rule knows
 * nothing about named beaches: depth, slope direction and the vehicle's
 * velocity decide (V9), so every stretch of shore behaves the same.
 */
export function shoreDecision(c: ShoreContext): ShoreDecision {
  if (!c.onShore) return null;
  const { state } = c;
  const groundForm = state === "car" || state === "preparing-flight" || state === "transforming-to-car" || state === "landing";
  if (groundForm) {
    if (c.depth >= BOAT_ENTER_DEPTH && c.seawardSpeed > SHORE_DIRECTION_SPEED && c.sinceLast >= LOCKOUT) return "to-boat";
    return null;
  }
  if (state === "exiting-water") {
    // Reverted by the terrain: pushed back out while the wheels were coming down.
    return c.depth >= BOAT_ENTER_DEPTH && c.seawardSpeed > SHORE_DIRECTION_SPEED ? "to-boat" : null;
  }
  if (state === "floating") {
    if (c.depth <= BOAT_EXIT_DEPTH && c.seawardSpeed < -SHORE_DIRECTION_SPEED && c.sinceLast >= LOCKOUT) return "to-car";
    return null;
  }
  if (state === "transforming-to-boat") {
    return c.depth <= BOAT_EXIT_DEPTH && c.seawardSpeed < -SHORE_DIRECTION_SPEED ? "to-car" : null;
  }
  return null;
}

/** Flight state at the lip: the ground speed becomes airspeed along the nose, the slope the initial pitch. */
export function launchPose(speed: number, slope: number): { speed: number; pitch: number } {
  return { speed: Math.max(TAKEOFF_SPEED, speed), pitch: Math.max(0.12, Math.min(0.45, slope)) };
}

/** Hop off a lip (or any drop) without flight: vertical velocity from the slope, then gravity. */
export function hopVelocity(speed: number, slope: number): number {
  return Math.max(0, speed) * Math.sin(Math.max(0, slope));
}

/** One step of the car's vertical model while airborne. Returns the new height, velocity and whether it touched the ground. */
export function stepHop(y: number, vy: number, groundY: number, dt: number, g = HOP_GRAVITY): { y: number; vy: number; landed: boolean } {
  const nvy = vy - g * dt;
  const ny = y + nvy * dt;
  if (ny <= groundY) return { y: groundY, vy: 0, landed: true };
  return { y: ny, vy: nvy, landed: false };
}

/** Boat velocity from the car's signed speed along its heading. */
export function boatVelocityFromCar(speed: number, heading: number): { vx: number; vz: number } {
  return { vx: Math.sin(heading) * speed, vz: Math.cos(heading) * speed };
}

/** Car signed speed from the boat's velocity (its component along the heading). */
export function carSpeedFromBoat(vx: number, vz: number, heading: number): number {
  return vx * Math.sin(heading) + vz * Math.cos(heading);
}

/** Visual progress of each body's parts for a state and the clock of the running sequence (0 = car body). */
export function partsProgress(state: VehicleState, t: number, duration: number): { wings: number; floats: number } {
  const u = duration > 0 ? Math.max(0, Math.min(1, t / duration)) : 1;
  const eased = u * u * (3 - 2 * u);
  switch (state) {
    case "transforming-to-plane":
      return { wings: eased, floats: 0 };
    case "flying":
    case "landing":
      return { wings: 1, floats: 0 };
    case "transforming-to-car":
      return { wings: 1 - eased, floats: 0 };
    case "transforming-to-boat":
      return { wings: 0, floats: eased };
    case "floating":
      return { wings: 0, floats: 1 };
    case "exiting-water":
      return { wings: 0, floats: 1 - eased };
    default:
      return { wings: 0, floats: 0 };
  }
}
