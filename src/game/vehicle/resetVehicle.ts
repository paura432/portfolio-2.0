import { beaches } from "@/data/beaches";
import { SKYPORT } from "@/data/skyport";
import { CAR_SPAWN } from "@/data/world";
import { useGameStore } from "@/stores/gameStore";
import { createBoatState } from "./boatPhysics";
import { liveBoat } from "./boatState";
import { createCarState } from "./carPhysics";
import { liveCar } from "./carState";
import { bumpGeneration, liveVehicle } from "./liveVehicle";
import { poseOf } from "./vehicleManager";

/** Recovery points: the city spawn, the Skyport apron and the top of every beach (facing inland). */
export function recoveryPoints(): { x: number; z: number; heading: number }[] {
  return [
    { x: CAR_SPAWN.position[0], z: CAR_SPAWN.position[1], heading: CAR_SPAWN.heading },
    { x: SKYPORT.spawn.x, z: SKYPORT.spawn.z, heading: SKYPORT.spawn.heading },
    ...beaches.map((b) => {
      const mx = (b.edge.from[0] + b.edge.to[0]) / 2 - b.seaward[0] * 6;
      const mz = (b.edge.from[1] + b.edge.to[1]) / 2 - b.seaward[1] * 6;
      return { x: mx, z: mz, heading: Math.atan2(-b.seaward[0], -b.seaward[1]) };
    }),
  ];
}

/**
 * The R key / "Reset" button: whatever the body and the state, the vehicle
 * becomes the car at the nearest recovery point, stopped. Any transformation,
 * flight, hop or pier glide is cancelled; the player always lands in a
 * controllable state.
 */
export function resetActiveVehicle(): void {
  const store = useGameStore.getState();
  const pose = poseOf(store.vehicleState);
  let best = recoveryPoints()[0]!;
  let bestD = Infinity;
  for (const p of recoveryPoints()) {
    const d = Math.hypot(p.x - pose.x, p.z - pose.z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  liveCar.state = createCarState(best.x, best.z, best.heading);
  liveBoat.state = createBoatState(best.x, best.z, best.heading);
  liveVehicle.y = 0;
  liveVehicle.vy = 0;
  liveVehicle.airborne = false;
  liveVehicle.groundPitch = 0;
  liveVehicle.onRamp = null;
  liveVehicle.sinceTransform = 10;
  liveVehicle.clock = { state: "car", t: 0, duration: 0 };
  bumpGeneration();
  store.resetVehicle();
}
