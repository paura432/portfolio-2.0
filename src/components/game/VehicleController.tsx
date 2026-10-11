"use client";

import { useFrame } from "@react-three/fiber";
import { getHarbor } from "@/data/archipelago";
import { liveBoat } from "@/game/vehicle/boatState";
import { liveVehicle } from "@/game/vehicle/liveVehicle";
import { DURATION, isTransforming, partsProgress, type VehicleState } from "@/game/vehicle/transformer";
import { transitionClock } from "@/game/vehicle/vehicleManager";
import { useGameStore } from "@/stores/gameStore";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Longest simulated step per frame, as the vehicle models use (`maxDt · 3`). */
const PHYSICS_FRAME_CLAMP = 0.1;

/**
 * Times the two kinds of sequences PAU TRANSFORMER-X runs (paused with the
 * game): the pier glide (moor / cast off) and the transformation clock the
 * parts animate from. When a transformation's clock runs out the state
 * machine moves on (floats out → floating, wheels down → car, wings folded →
 * car); the wings-out sequence keeps its state until the lip launches or the
 * ramp rule aborts. Runs before the vehicle (-4) so the frame a sequence
 * completes is the frame the vehicle reads the new state.
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
  // Same clamp as the physics (0.1 s per frame): on a slow frame the glide and the hull advance together.
  transitionClock.t += Math.min(delta, PHYSICS_FRAME_CLAMP);
  if (t.kind === "moor") {
    const m = getHarbor(t.harbor).mooring;
    const s = transitionClock.progress();
    const b = liveBoat.state;
    const dh = wrap(m.heading - b.heading);
    const k = Math.min(1, delta * 4 + s * 0.08);
    liveBoat.state = { ...b, x: b.x + (m.position[0] - b.x) * k, z: b.z + (m.position[1] - b.z) * k, heading: b.heading + dh * k, vx: b.vx * (1 - k), vz: b.vz * (1 - k), yawRate: 0, throttle: 0, bump: 0 };
  }
  if (transitionClock.t >= t.duration) store.completeTransition();
}

/** Where a sequence ends on its own (the wings-out sequence ends by launch or abort instead). */
const COMPLETES_TO: Partial<Record<VehicleState, VehicleState>> = {
  "transforming-to-car": "car",
  "transforming-to-boat": "floating",
  "exiting-water": "car",
};

function stepTransform(store: Store, delta: number) {
  const s = store.vehicleState;
  const clock = liveVehicle.clock;
  if (!isTransforming(s)) {
    if (clock.state !== s) {
      clock.state = s;
      clock.t = 0;
      clock.duration = 0;
    }
    return;
  }
  if (clock.state !== s) {
    // A new sequence: when it reverses a running one the parts continue from where they are instead of snapping.
    const prev = partsProgress(clock.state, clock.t, clock.duration);
    const duration = DURATION[s as keyof typeof DURATION];
    let t0 = 0;
    if (s === "transforming-to-car" && clock.state === "transforming-to-plane") t0 = duration * (1 - prev.wings);
    if (s === "exiting-water" && clock.state === "transforming-to-boat") t0 = duration * (1 - prev.floats);
    if (s === "transforming-to-boat" && clock.state === "exiting-water") t0 = duration * prev.floats;
    clock.state = s;
    clock.t = t0;
    clock.duration = duration;
  }
  if (store.phase !== "playing") return;
  // V9: the sequence clock never outruns the physics. The car, the boat and the aircraft integrate at most 0.1 s per
  // frame; with a 0.4 s clamp a slow frame let the wings or the wheels finish while the body had barely moved
  // (the hull came ashore too far out, the lip launch could fire a frame late), so the two now share one clamp.
  clock.t += Math.min(delta, PHYSICS_FRAME_CLAMP);
  if (clock.t >= clock.duration) {
    const next = COMPLETES_TO[s];
    if (next) {
      liveVehicle.sinceTransform = 0;
      store.setVehicleState(next);
    }
  }
}
