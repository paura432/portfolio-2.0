import { getHarbor, type HarborId } from "@/data/archipelago";
import type { GamePhase } from "@/stores/gameStore";
import { boatSpeed } from "./boatPhysics";
import { liveBoat } from "./boatState";
import { liveCar } from "./carState";
import { liveVehicle } from "./liveVehicle";
import { livePlane } from "./planeState";
import { authorityOf, type Authority, type VehicleState } from "./transformer";

export type { Authority, VehicleState };

/**
 * Vehicle manager (V8). One vehicle, three bodies: the explicit state lives
 * in the game store (`vehicleState`), the physics model that owns the
 * position is derived from it (`authorityOf`), and this module is the single
 * place that reads the live pose for the camera, sensors, HUD and minimap.
 * Piers keep the V6 mooring (dock, explore, cast off) as a short glide.
 */
export type TransitionKind = "moor" | "cast-off";

export interface VehicleTransition {
  kind: TransitionKind;
  harbor: HarborId;
  /** Seconds. */
  duration: number;
}

export const TRANSITION_DURATION: Record<TransitionKind, number> = { moor: 1.0, "cast-off": 0.6 };

/** The vehicle-related slice of the store (serialisable, no live state). */
export interface VehicleSnapshot {
  vehicleState: VehicleState;
  transition: VehicleTransition | null;
  /** Hull tied up at a pier: the player is "on the pier". */
  mooredAt: HarborId | null;
  /** Hull inside a pier's docking zone. */
  nearbyDock: HarborId | null;
}

export type VehicleMode = VehicleState | "paused" | "docking" | "moored";

export const DOCKING_MAX_SPEED = 4;

export function resolveVehicleMode(phase: GamePhase, v: VehicleSnapshot): VehicleMode {
  if (phase !== "playing") return "paused";
  if (v.transition) return v.transition.kind === "moor" ? "docking" : "floating";
  if (v.mooredAt) return "moored";
  if (v.vehicleState === "floating" && v.nearbyDock) return "docking";
  return v.vehicleState;
}

/** The vehicle answers to the controls while playing, outside a pier glide and not tied up. Transformations never lock the controls. */
export function canControl(phase: GamePhase, v: VehicleSnapshot): boolean {
  return phase === "playing" && v.transition === null && v.mooredAt === null;
}

export function canDock(speed: number, nearbyDock: HarborId | null): boolean {
  return nearbyDock !== null && speed <= DOCKING_MAX_SPEED;
}

export function makeTransition(kind: TransitionKind, harbor: HarborId): VehicleTransition {
  return { kind, harbor, duration: TRANSITION_DURATION[kind] };
}

/** What the store becomes when a pier glide completes. */
export function applyTransition(v: VehicleSnapshot): Pick<VehicleSnapshot, "transition" | "mooredAt"> {
  const t = v.transition;
  if (!t) return { transition: null, mooredAt: v.mooredAt };
  return { transition: null, mooredAt: t.kind === "moor" ? t.harbor : null };
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Ground / air speed magnitude. */
  speed: number;
  /** Nose pitch (aircraft; the car body's ground pitch otherwise). */
  pitch: number;
}

/** The authoritative live pose: read from whichever physics model owns the position in this state. */
export function poseOf(state: VehicleState): Pose {
  switch (authorityOf(state)) {
    case "plane": {
      const p = livePlane.state;
      return { x: p.x, y: p.y, z: p.z, heading: p.heading, speed: p.speed, pitch: p.pitch };
    }
    case "boat": {
      const b = liveBoat.state;
      return { x: b.x, z: b.z, y: liveBoat.visual.y, heading: b.heading, speed: boatSpeed(b), pitch: 0 };
    }
    default: {
      const c = liveCar.state;
      return { x: c.x, y: liveVehicle.y, z: c.z, heading: c.heading, speed: Math.abs(c.speed), pitch: liveVehicle.groundPitch };
    }
  }
}

export function generationOf(): number {
  return liveVehicle.generation;
}

export function mooringOf(harbor: HarborId) {
  return getHarbor(harbor).mooring;
}

/**
 * Live pier-glide progress, advanced by the VehicleController each frame
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
