"use client";

import { useFrame } from "@react-three/fiber";
import { getHarbor } from "@/data/archipelago";
import { liveBoat } from "@/game/vehicle/boatState";
import { transitionClock } from "@/game/vehicle/vehicleManager";
import { useGameStore } from "@/stores/gameStore";

/**
 * Advances the running vehicle transition (paused with the game), glides the
 * boat into its mooring while it docks, and tells the store when the
 * transition is over. Runs before the vehicles (-4) so the frame they read a
 * completed transition is the frame they regain control.
 */
export function VehicleController() {
  useFrame((_, delta) => {
    const store = useGameStore.getState();
    const t = store.transition;
    if (!t) {
      transitionClock.current = null;
      transitionClock.t = 0;
      return;
    }
    if (transitionClock.current !== t) {
      transitionClock.current = t;
      transitionClock.t = 0;
    }
    if (store.phase !== "playing") return;
    transitionClock.t += Math.min(delta, 0.1);

    // Docking: the hull eases onto the mooring so the parked boat always sits neatly alongside the pier.
    if (t.kind === "moor" || t.kind === "disembark") {
      const m = getHarbor(t.harbor).mooring;
      const s = transitionClock.progress();
      const b = liveBoat.state;
      const dh = Math.atan2(Math.sin(m.heading - b.heading), Math.cos(m.heading - b.heading));
      const k = Math.min(1, delta * 4 + s * 0.08);
      liveBoat.state = {
        ...b,
        x: b.x + (m.position[0] - b.x) * k,
        z: b.z + (m.position[1] - b.z) * k,
        heading: b.heading + dh * k,
        vx: b.vx * (1 - k),
        vz: b.vz * (1 - k),
        yawRate: 0,
        throttle: 0,
        bump: 0,
      };
    }

    if (transitionClock.t >= t.duration) store.completeTransition();
  }, -4);
  return null;
}
