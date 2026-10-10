import { CAR_SPAWN } from "@/data/world";
import { createCarState, type CarState } from "./carPhysics";

/**
 * Live car state shared between the vehicle, camera and proximity systems.
 * Mutated in the render loop; never put in React state.
 * `generation` increments on every reset so the camera can snap instead of glide.
 */
export const liveCar: { state: CarState; generation: number } = {
  state: createCarState(CAR_SPAWN.position[0], CAR_SPAWN.position[1], CAR_SPAWN.heading),
  generation: 0,
};

/** Teleport the car back to the spawn point (recovery action for a stuck player). */
export function resetCar(): void {
  liveCar.state = createCarState(CAR_SPAWN.position[0], CAR_SPAWN.position[1], CAR_SPAWN.heading);
  liveCar.generation++;
}
