import { getHarbor, harbors, type HarborId } from "@/data/archipelago";
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

/** Harbor whose mooring is closest to a point. */
export function nearestHarbor(x: number, z: number): HarborId {
  let best = harbors[0]!;
  let bestD = Infinity;
  for (const h of harbors) {
    const d = Math.hypot(h.mooring.position[0] - x, h.mooring.position[1] - z);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best.id;
}

/** Put the boat back at a harbor mooring (default: the nearest one). Recovery action for a stuck player. */
export function resetBoat(harbor: HarborId = nearestHarbor(liveBoat.state.x, liveBoat.state.z)): void {
  liveBoat.state = spawnAt(harbor);
  liveBoat.generation++;
}

/** Place the boat (test/capture tooling). */
export function placeBoat(x: number, z: number, heading: number): void {
  liveBoat.state = createBoatState(x, z, heading);
  liveBoat.generation++;
}
