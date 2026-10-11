import { PLATFORM } from "@/data/world";
import { resolveCollisions } from "../physics/collision";
import { CAR_CONFIG, createCarState, stepCar, type CarState, type Constrain } from "../vehicle/carPhysics";
import { CAR_RADIUS, clampToDriveArea, constrainCar, obstacles } from "./obstacles";
import { propWorld } from "./propWorld";
import { constrainRampBodies } from "./rampColliders";
import { treeWorld } from "./treeWorld";

/**
 * Wedge sweep (V9): the navigation audit that found the "car stuck beside a
 * building, a planter and the sidewalk" P0. Every grid point of drivable land
 * where the car fits and has something solid within reach in at least two
 * directions is tried from several headings; from each pose the real car
 * model with the vehicle's real constraint gets a few seconds with each of
 * six constant inputs. A pose is a wedge when none of them moves the car
 * `need` units away. Pure; used by the regression test and the audit report.
 */
export const constrainVehicle: Constrain = (x, z, step) => {
  const c = constrainCar(x, z, step);
  const r = constrainRampBodies(c.x, c.z, step?.prevX ?? c.x, step?.prevZ ?? c.z);
  return r.blocked ? { x: r.x, z: r.z, blocked: true } : c;
};

const INPUTS = [
  { throttle: 1, steer: 0, brake: false },
  { throttle: -1, steer: 0, brake: false },
  { throttle: 1, steer: 1, brake: false },
  { throttle: 1, steer: -1, brake: false },
  { throttle: -1, steer: 1, brake: false },
  { throttle: -1, steer: -1, brake: false },
];

export interface WedgeOptions {
  /** Grid pitch (u). */
  pitch?: number;
  headings?: number;
  /** Seconds per input. */
  seconds?: number;
  /** Distance that counts as "free". */
  need?: number;
  /** Reach within which a solid thing makes a spot "tight". */
  reach?: number;
  /** Restrict to a rectangle (default: the whole platform drive area). */
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface Wedge {
  x: number;
  z: number;
  heading: number;
  /** Best distance reached by any input. */
  best: number;
  /** What is around (obstacle ids, "tree", "prop", "edge"). */
  near: string[];
}

const probe = (x: number, z: number): string | null => {
  const hits = resolveCollisions({ x, z, r: CAR_RADIUS }, obstacles, Infinity).hits;
  if (hits.length) return hits[0]!;
  const step = { prevX: x, prevZ: z, speed: 0, heading: 0, dt: 1 / 60 };
  if (treeWorld.constrain(x, z, step).blocked) return "tree";
  if (propWorld.constrain(x, z, step).blocked) return "prop";
  if (clampToDriveArea(x, z, CAR_RADIUS).boundary) return "edge";
  return null;
};

/** Snapshot of the live tree and prop simulations, restored after each trial so trials never see each other's damage. */
function snapshot() {
  const trees = treeWorld.states.map((s) => ({ ...s }));
  const props = propWorld.states.map((s) => ({ ...s }));
  return () => {
    treeWorld.states.forEach((s, i) => Object.assign(s, trees[i]));
    propWorld.states.forEach((s, i) => Object.assign(s, props[i]));
  };
}

/**
 * Can the car get `need` units away from this pose with one constant input
 * within `seconds`? The simulations advance with the car (a rammed trunk
 * falls and clears, as in the game) and are restored afterwards.
 */
export function escapes(s0: CarState, seconds = 3, need = 2.5): { ok: boolean; best: number } {
  let best = 0;
  const steps = Math.round(seconds * 60);
  const restore = snapshot();
  try {
    for (const input of INPUTS) {
      let s = s0;
      for (let i = 0; i < steps; i++) {
        s = stepCar(s, input, 1 / 60, CAR_CONFIG, constrainVehicle);
        treeWorld.update(1 / 60, s.x, s.z);
        propWorld.update(1 / 60, s.x, s.z);
        const d = Math.hypot(s.x - s0.x, s.z - s0.z);
        if (d > best) best = d;
        if (d >= need) return { ok: true, best: d };
      }
      restore();
    }
  } finally {
    restore();
    treeWorld.takeDirty();
    treeWorld.takeEvents();
    propWorld.takeDirty();
    propWorld.takeEvents();
  }
  return { ok: false, best };
}

export function sweepWedges(o: WedgeOptions = {}): { tight: number; wedges: Wedge[] } {
  const pitch = o.pitch ?? 1.5;
  const headings = o.headings ?? 8;
  const reach = o.reach ?? 2.6;
  const half = PLATFORM.driveHalfSize;
  const b = o.bounds ?? { minX: -half, maxX: half, minZ: -half, maxZ: half };
  const wedges: Wedge[] = [];
  let tight = 0;
  for (let x = b.minX; x <= b.maxX; x += pitch) {
    for (let z = b.minZ; z <= b.maxZ; z += pitch) {
      if (probe(x, z)) continue;
      const near: string[] = [];
      for (const [dx, dz] of [
        [reach, 0],
        [-reach, 0],
        [0, reach],
        [0, -reach],
      ] as const) {
        const what = probe(x + dx, z + dz);
        if (what) near.push(what);
      }
      if (near.length < 2) continue;
      tight++;
      for (let k = 0; k < headings; k++) {
        const heading = (k * Math.PI * 2) / headings;
        // Quick trial first; a pose that fails it gets a longer one (a crawl through a tree cluster is slow,
        // not stuck). A wedge is a pose that fails both.
        const quick = escapes(createCarState(x, z, heading), o.seconds, o.need);
        if (quick.ok) continue;
        const long = escapes(createCarState(x, z, heading), (o.seconds ?? 3) * 2, (o.need ?? 2.5) * 1.6);
        if (!long.ok) wedges.push({ x, z, heading, best: Math.max(quick.best, long.best), near });
      }
    }
  }
  return { tight, wedges };
}
