import { useGameStore } from "@/stores/gameStore";
import { resetBoat } from "./boatState";
import { resetCar } from "./carState";

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
  } else {
    resetCar();
  }
}
