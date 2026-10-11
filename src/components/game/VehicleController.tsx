"use client";

import { useFrame } from "@react-three/fiber";
import { getHarbor } from "@/data/archipelago";
import { SKYPORT } from "@/data/skyport";
import { liveBoat } from "@/game/vehicle/boatState";
import { createCarState } from "@/game/vehicle/carPhysics";
import { liveCar } from "@/game/vehicle/carState";
import { createPlaneState } from "@/game/vehicle/planePhysics";
import { livePlane } from "@/game/vehicle/planeState";
import { TRANSFORM_DURATION } from "@/game/vehicle/transform";
import { transformClock, TRANSFORMING, transitionClock } from "@/game/vehicle/vehicleManager";
import { useGameStore } from "@/stores/gameStore";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Advances the running vehicle transition (paused with the game), glides the
 * boat into its mooring while it docks, runs the car ⇄ aircraft
 * transformation clock (V7) and synchronises the two live states at the
 * transformation instants, and tells the store when each sequence is over.
 * Runs before the vehicles (-4) so the frame they read a completed sequence
 * is the frame they regain control.
 */
export function VehicleController() {
  useFrame((_, delta) => {
    const store = useGameStore.getState();
    stepTransition(store, delta);
    stepTransform(store, delta);
  }, -4);
  return null;
}

type Store = ReturnType<typeof useGameStore.getState>;

function stepTransition(store: Store, delta: number) {
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
  // Wall-clock within reason: a transition is a short cinematic, so a slow frame still advances it by up to
  // 0.4 s (software renderers would otherwise need a dozen frames for a one-second hand-over).
  transitionClock.t += Math.min(delta, 0.4);

  // Docking: the hull eases onto the mooring so the parked boat always sits neatly alongside the pier.
  if (t.kind === "moor" || t.kind === "disembark") {
    const m = getHarbor(t.harbor).mooring;
    const s = transitionClock.progress();
    const b = liveBoat.state;
    const dh = wrap(m.heading - b.heading);
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
}

function stepTransform(store: Store, delta: number) {
  const f = store.flight;
  if (!TRANSFORMING.has(f)) {
    transformClock.phase = f;
    transformClock.t = 0;
    transformClock.duration = 0;
    return;
  }
  if (transformClock.phase !== f) {
    transformClock.phase = f;
    transformClock.t = 0;
    transformClock.duration = f === "transforming-to-plane" ? TRANSFORM_DURATION.toPlane : TRANSFORM_DURATION.toCar;
    if (f === "transforming-to-plane") {
      // Car → aircraft: the aircraft starts exactly where the car stopped, on the runway surface.
      const c = liveCar.state;
      livePlane.state = createPlaneState(c.x, SKYPORT.runway.y, c.z, c.heading);
    }
  }
  if (store.phase !== "playing") return;
  transformClock.t += Math.min(delta, 0.4);
  const s = transformClock.progress();

  if (f === "transforming-to-plane") {
    // While the wings come out the vehicle settles on the pad centre and lines up with the runway.
    const p = livePlane.state;
    const k = Math.min(1, delta * 2.5 + s * 0.05);
    livePlane.state = {
      ...p,
      x: p.x + (SKYPORT.pad.x - p.x) * k,
      z: p.z + (SKYPORT.pad.z - p.z) * k,
      heading: p.heading + wrap(SKYPORT.runway.heading - p.heading) * k,
      speed: 0,
    };
  }

  if (transformClock.t >= transformClock.duration) {
    if (f === "transforming-to-car") {
      // Aircraft → car: the car appears where the aircraft rolled to a stop, same heading.
      const p = livePlane.state;
      liveCar.state = createCarState(p.x, p.z, p.heading);
    }
    store.completeTransform();
  }
}
