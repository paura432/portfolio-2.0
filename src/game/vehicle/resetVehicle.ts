import { useGameStore } from "@/stores/gameStore";
import { SKYPORT } from "@/data/skyport";
import { resetBoat } from "./boatState";
import { liveCar, resetCar } from "./carState";
import { createCarState } from "./carPhysics";
import { resetPlane } from "./planeState";

/**
 * The R key / "Reset" button: puts the active vehicle back at its spawn (car)
 * or the nearest mooring (boat). A transition in flight is cancelled first so
 * the player always lands in a controllable state, never in limbo.
 */
export function resetActiveVehicle(): void {
  const store = useGameStore.getState();
  if (store.transition) store.cancelTransition();
  const active = useGameStore.getState().activeVehicle;
  if (active === "boat") {
    resetBoat();
    if (useGameStore.getState().mooredAt) useGameStore.setState({ mooredAt: null });
  } else if (useGameStore.getState().carForm === "plane" || useGameStore.getState().flight !== "ground") {
    // V7: flying or mid-transformation → back on the Skyport pad as a car.
    useGameStore.getState().resetFlight();
    resetPlane();
    liveCar.state = createCarState(SKYPORT.spawn.x, SKYPORT.spawn.z, SKYPORT.spawn.heading);
    liveCar.generation++;
  } else {
    resetCar();
  }
}
