import { SKYPORT } from "@/data/skyport";
import { createPlaneState, type PlaneState } from "./planePhysics";

/**
 * Live aircraft state (V7): the car's flight form. Mutated in the render
 * loop; never put in React state. Synchronised with `liveCar` at the two
 * transformation instants (see VehicleController). `generation` increments
 * on resets so the camera snaps.
 */
export const livePlane: { state: PlaneState; generation: number } = {
  state: createPlaneState(SKYPORT.spawn.x, SKYPORT.runway.y, SKYPORT.spawn.z, SKYPORT.spawn.heading),
  generation: 0,
};

/** Put the aircraft on the pad, stopped, heading down the runway. */
export function resetPlane(): void {
  livePlane.state = createPlaneState(SKYPORT.spawn.x, SKYPORT.runway.y, SKYPORT.spawn.z, SKYPORT.spawn.heading);
  livePlane.generation++;
}

/** Place the aircraft (test/capture tooling); `airborne` starts it in level flight at cruise speed. */
export function placePlane(x: number, y: number, z: number, heading: number, airborne = false, speed = 24): void {
  livePlane.state = { ...createPlaneState(x, y, z, heading), onGround: !airborne, speed: airborne ? speed : 0 };
  livePlane.generation++;
}
