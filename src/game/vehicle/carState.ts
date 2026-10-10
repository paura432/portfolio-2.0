import { CAR_SPAWN } from "@/data/world";
import { createCarState, type CarState } from "./carPhysics";

/**
 * Live car state shared between the vehicle, camera and proximity systems.
 * Mutated in the render loop; never put in React state.
 */
export const liveCar: { state: CarState } = {
  state: createCarState(CAR_SPAWN.position[0], CAR_SPAWN.position[1], CAR_SPAWN.heading),
};

export function resetCar(): void {
  liveCar.state = createCarState(CAR_SPAWN.position[0], CAR_SPAWN.position[1], CAR_SPAWN.heading);
}
