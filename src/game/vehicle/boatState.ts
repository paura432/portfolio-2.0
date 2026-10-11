import { getHarbor, type HarborId } from "@/data/archipelago";
import { createBoatState, type BoatState } from "./boatPhysics";

/**
 * Live boat state shared between the boat, the camera, the ocean (wake) and
 * the minimap. Mutated in the render loop; never put in React state.
 * `generation` increments on every reset so the camera snaps instead of gliding.
 * `visual` is the buoyancy layer (height, pitch, roll) kept apart from the 2D physics.
 */
export const liveBoat: {
  state: BoatState;
  generation: number;
  visual: { y: number; pitch: number; roll: number };
} = {
  state: spawnAt("pau-harbor"),
  generation: 0,
  visual: { y: 0, pitch: 0, roll: 0 },
};

function spawnAt(harbor: HarborId): BoatState {
  const m = getHarbor(harbor).mooring;
  return createBoatState(m.position[0], m.position[1], m.heading);
}

/** Place the boat (test/capture tooling). */
export function placeBoat(x: number, z: number, heading: number): void {
  liveBoat.state = createBoatState(x, z, heading);
  liveBoat.generation++;
}
