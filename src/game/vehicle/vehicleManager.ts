import { getHarbor, type HarborId, type VehicleId } from "@/data/archipelago";
import type { GamePhase } from "@/stores/gameStore";
import { boatSpeed } from "./boatPhysics";
import { liveBoat } from "./boatState";
import { liveCar } from "./carState";

export type { VehicleId };

/**
 * Vehicle manager (V6). One vehicle receives the controls at a time; the
 * others stay exactly where they were left. The explicit vehicle mode is a
 * *derived* view of the game store (phase + vehicle fields), so there is one
 * state machine, not two: the store decides, this module reads.
 */
export type VehicleMode = "driving-car" | "approaching-dock" | "boarding" | "driving-boat" | "docking" | "disembarking" | "vehicle-paused";

export type TransitionKind = "board" | "disembark" | "moor" | "cast-off";

export interface VehicleTransition {
  kind: TransitionKind;
  from: VehicleId;
  to: VehicleId;
  harbor: HarborId;
  /** Seconds. */
  duration: number;
}

export const TRANSITION_DURATION: Record<TransitionKind, number> = {
  board: 1.5,
  disembark: 1.5,
  moor: 1.0,
  "cast-off": 0.6,
};

/** The vehicle-related slice of the store (serialisable, no live state). */
export interface VehicleSnapshot {
  activeVehicle: VehicleId;
  transition: VehicleTransition | null;
  /** Boat tied up at a pier without a land vehicle: the player is "on the pier". */
  mooredAt: HarborId | null;
  /** Car inside a harbor's boarding zone. */
  nearbyHarbor: HarborId | null;
  /** Boat inside a harbor's docking zone. */
  nearbyDock: HarborId | null;
}

export const BOARDING_MAX_SPEED = 2.5;
export const DOCKING_MAX_SPEED = 4;
/** The car counts as parked at a harbor when it is within this distance of the pier root. */
export const CAR_AT_HARBOR_RADIUS = 26;

export function resolveVehicleMode(phase: GamePhase, v: VehicleSnapshot): VehicleMode {
  if (phase !== "playing") return "vehicle-paused";
  if (v.transition) {
    if (v.transition.kind === "board") return "boarding";
    if (v.transition.kind === "disembark") return "disembarking";
    return v.transition.kind === "moor" ? "docking" : "driving-boat";
  }
  if (v.activeVehicle === "car") return v.nearbyHarbor ? "approaching-dock" : "driving-car";
  if (v.mooredAt) return "docking";
  return v.nearbyDock ? "docking" : "driving-boat";
}

/** Only the active vehicle, while playing, outside transitions and not moored, answers to the controls. */
export function canControl(vehicle: VehicleId, phase: GamePhase, v: VehicleSnapshot): boolean {
  return phase === "playing" && v.activeVehicle === vehicle && v.transition === null && !(vehicle === "boat" && v.mooredAt !== null);
}

/** Slow enough, inside the zone: the "Press E to board" prompt is allowed. */
export function canBoard(carSpeed: number, nearbyHarbor: HarborId | null): boolean {
  return nearbyHarbor !== null && Math.abs(carSpeed) <= BOARDING_MAX_SPEED;
}

export function canDock(speed: number, nearbyDock: HarborId | null): boolean {
  return nearbyDock !== null && speed <= DOCKING_MAX_SPEED;
}

/** Whether the car is parked at this harbor (so docking there hands the controls back to it). */
export function carAvailableAt(harbor: HarborId, carX: number, carZ: number): boolean {
  const h = getHarbor(harbor);
  if (!h.landVehicles.includes("car")) return false;
  return Math.hypot(carX - h.pierRoot[0], carZ - h.pierRoot[1]) <= CAR_AT_HARBOR_RADIUS;
}

export function makeTransition(kind: TransitionKind, harbor: HarborId): VehicleTransition {
  const from: VehicleId = kind === "board" ? "car" : "boat";
  const to: VehicleId = kind === "disembark" ? "car" : "boat";
  return { kind, from, to, harbor, duration: TRANSITION_DURATION[kind] };
}

/** What the store becomes when a transition completes. */
export function applyTransition(v: VehicleSnapshot): Pick<VehicleSnapshot, "activeVehicle" | "transition" | "mooredAt"> {
  const t = v.transition;
  if (!t) return { activeVehicle: v.activeVehicle, transition: null, mooredAt: v.mooredAt };
  switch (t.kind) {
    case "board":
      return { activeVehicle: "boat", transition: null, mooredAt: null };
    case "disembark":
      return { activeVehicle: "car", transition: null, mooredAt: null };
    case "moor":
      return { activeVehicle: "boat", transition: null, mooredAt: t.harbor };
    case "cast-off":
      return { activeVehicle: "boat", transition: null, mooredAt: null };
  }
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Ground speed magnitude. */
  speed: number;
}

/** Live pose of a vehicle (position, height and heading) for the camera, sensors and minimap. */
export function poseOf(vehicle: VehicleId): Pose {
  if (vehicle === "car") {
    const s = liveCar.state;
    return { x: s.x, y: 0, z: s.z, heading: s.heading, speed: Math.abs(s.speed) };
  }
  const s = liveBoat.state;
  return { x: s.x, y: liveBoat.visual.y, z: s.z, heading: s.heading, speed: boatSpeed(s) };
}

export function generationOf(vehicle: VehicleId): number {
  return vehicle === "car" ? liveCar.generation : liveBoat.generation;
}

/**
 * Live transition progress, advanced by the VehicleController each frame
 * (paused with the game). `current` is the store's transition object: a new
 * reference restarts the clock.
 */
export const transitionClock = {
  current: null as VehicleTransition | null,
  t: 0,
  /** 0..1 eased progress of the current transition (0 when none). */
  progress(): number {
    if (!this.current) return 0;
    const u = Math.max(0, Math.min(1, this.t / this.current.duration));
    return u * u * (3 - 2 * u);
  },
};
