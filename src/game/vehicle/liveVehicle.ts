import type { RampId } from "@/data/ramps";
import type { VehicleState } from "./transformer";

/**
 * Live, non-React state of PAU TRANSFORMER-X (V8) that is not owned by one
 * of the three physics models: the car body's vertical model (ground
 * following, hops off a lip), the ramp being climbed, the lockout timer and
 * the clock of the running transformation. The position itself lives in the
 * physics state of the current authority (`liveCar`, `liveBoat`,
 * `livePlane`); the other two are frozen and overwritten at every hand-over,
 * so there is exactly one authoritative pose at any time (see `poseOf`).
 */
export const liveVehicle = {
  /** Car body height and vertical speed (ground following; a hop is airborne). */
  y: 0,
  vy: 0,
  airborne: false,
  /** Ground pitch under the car body (nose up positive), from the terrain slope. */
  groundPitch: 0,
  /** Ramp whose slope the car is on (exempt from the ramp body colliders). */
  onRamp: null as RampId | null,
  /** Seconds since a transformation completed (lockout). */
  sinceTransform: 10,
  /** Running transformation clock; `state` is the sequence it times. */
  clock: { state: "car" as VehicleState, t: 0, duration: 0 },
  /** Increments on resets and teleports so the camera snaps. */
  generation: 0,
  /** Eased 0..1 progress of the running transformation (1 when none runs). */
  progress(): number {
    if (this.clock.duration <= 0) return 1;
    const u = Math.max(0, Math.min(1, this.clock.t / this.clock.duration));
    return u * u * (3 - 2 * u);
  },
};

export function bumpGeneration(): void {
  liveVehicle.generation++;
}
