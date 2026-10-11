import { QUAY_DRIVE } from "@/data/archipelago";
import { beachDriveRect, beaches } from "@/data/beaches";
import { rampPoint, ramps } from "@/data/ramps";
import { allPlots, districts } from "@/data/districts";
import { SKYPORT_DRIVE_RECTS, SKYPORT_OBSTACLES } from "@/data/skyport";
import { PLATFORM } from "@/data/world";
import { boxFromFootprint, resolveCollisions, type Obstacle } from "../physics/collision";
import type { Constrain } from "../vehicle/carPhysics";
import { debugLog } from "../physics/debugLog";
import { bumpSpeed, type StepInfo } from "../vehicle/carPhysics";
import { propWorld } from "./propWorld";
import { treeWorld } from "./treeWorld";

/** Collision shapes derived from district data: one source of truth for visuals and physics. */
export const BUILDING_PADDING = 1.0;

export const CAR_RADIUS = 1.3;
export const DRIVE_HALF_SIZE = PLATFORM.driveHalfSize;

/** Harbor furniture the car must not drive through (V6): the harbor master's cabin on the quay. */
export const HARBOR_CABIN = { id: "harbor-cabin", position: [-73.6, -9.6] as [number, number], footprint: [3.4, 2.8] as [number, number] };

export const obstacles: Obstacle[] = [
  ...districts
    .filter((d) => d.built)
    .map((d): Obstacle => {
      if (d.kind === "hub") {
        // The hub pavilion is round; its footprint is the diameter.
        return { kind: "round", id: d.id, x: d.position[0], z: d.position[1], r: d.footprint[0] / 2 + BUILDING_PADDING };
      }
      return { kind: "box", ...boxFromFootprint(d.id, d.position, d.footprint, BUILDING_PADDING) };
    }),
  // Secondary buildings (campus labs) collide like any other building.
  ...allPlots()
    .filter((p) => p.id.includes(":"))
    .map((p): Obstacle => ({ kind: "box", ...boxFromFootprint(p.id, p.position, p.footprint, BUILDING_PADDING) })),
  { kind: "box", ...boxFromFootprint(HARBOR_CABIN.id, HARBOR_CABIN.position, HARBOR_CABIN.footprint, 0.6) },
  // Skyport buildings (V7).
  ...SKYPORT_OBSTACLES.map((b): Obstacle => ({ kind: "box", ...boxFromFootprint(b.id, b.position, b.footprint, 0.8) })),
  // Ramp side rails (V8): the slope can only be climbed from its approach. Axis-aligned ramps only (all three are).
  ...ramps.flatMap((r): Obstacle[] =>
    [-1, 1].map((side): Obstacle => {
      const a = rampPoint(r, 0, side * (r.width / 2 + 0.25));
      const b = rampPoint(r, r.length, side * (r.width / 2 + 0.25));
      return { kind: "box", id: `${r.id}-rail-${side > 0 ? "r" : "l"}`, minX: Math.min(a[0], b[0]) - 0.2, maxX: Math.max(a[0], b[0]) + 0.2, minZ: Math.min(a[1], b[1]) - 0.2, maxZ: Math.max(a[1], b[1]) + 0.2 };
    }),
  ),
];

export interface DriveRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Where the car may drive: the island platform plus the harbor quay (a union of rectangles). */
export const DRIVE_AREAS: DriveRect[] = [
  { minX: -DRIVE_HALF_SIZE, maxX: DRIVE_HALF_SIZE, minZ: -DRIVE_HALF_SIZE, maxZ: DRIVE_HALF_SIZE },
  // The quay overlaps the platform edge by more than a car diameter: the two rectangles, each shrunk by the
  // car radius, still overlap, so the seam never traps the car (see the walk-through test).
  { minX: QUAY_DRIVE.minX, maxX: QUAY_DRIVE.maxX + 2 * CAR_RADIUS + 2, minZ: QUAY_DRIVE.minZ, maxZ: QUAY_DRIVE.maxZ },
  // Causeway and Skyport Island (V7); each rectangle overlaps its neighbour by more than a car diameter.
  ...SKYPORT_DRIVE_RECTS,
  // Beaches (V8): from a little inside the island edge down the sand and into the shallows.
  ...beaches.map(beachDriveRect),
];

/**
 * Clamp a circle into the union of the drive rectangles: the candidate that
 * moves the centre least wins, which is exact for points outside every rect
 * and a no-op for points inside any of them.
 */
export function clampToDriveArea(x: number, z: number, r: number, areas: readonly DriveRect[] = DRIVE_AREAS): { x: number; z: number; boundary: boolean } {
  let bestX = x;
  let bestZ = z;
  let bestD = Infinity;
  for (const a of areas) {
    const cx = Math.max(a.minX + r, Math.min(a.maxX - r, x));
    const cz = Math.max(a.minZ + r, Math.min(a.maxZ - r, z));
    const d = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (d < bestD) {
      bestD = d;
      bestX = cx;
      bestZ = cz;
    }
  }
  return { x: bestX, z: bestZ, boundary: bestD > 1e-12 };
}

/** Contact log for the overlay and the probe (V9 debug): see `debugLog`; `contactLog` keeps the overlay's short list. */
export const contactLog = {
  enabled: false,
  items: [] as { x: number; z: number; what: string; n: number; nx: number; nz: number; depth: number }[],
  n: 0,
  push(x: number, z: number, what: string, nx = 0, nz = 0, depth = 0) {
    this.n++;
    this.items.push({ x, z, what, n: this.n, nx, nz, depth });
    if (this.items.length > 24) this.items.shift();
  },
};

function logContact(what: string, x0: number, z0: number, x1: number, z1: number, step: StepInfo | undefined, yieldedSpeed: number | undefined, reason: string): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const depth = Math.hypot(dx, dz);
  const nx = depth > 1e-9 ? dx / depth : 0;
  const nz = depth > 1e-9 ? dz / depth : 0;
  contactLog.push(x0, z0, what, nx, nz, depth);
  const speedBefore = step?.speed ?? 0;
  // A rigid contact gets the car model's own bump rule (head-on bounce or scrape); a yielding one the retained speed.
  const speedAfter = yieldedSpeed ?? (step ? bumpSpeed({ x: x0, z: z0, heading: step.heading, speed: speedBefore, steerAngle: 0 }, x1, z1) : speedBefore);
  debugLog.contact({ what, x0, z0, x1, z1, depth, nx, nz, heading: step?.heading ?? 0, speedBefore, speedAfter, reason });
}

/**
 * Constraint used by the vehicle each sub-step: buildings (rigid), the drive
 * area boundary (rigid), then the trees and the street furniture (rigid when
 * standing, yielding when hit fast enough; V9 props may also be shoved).
 */
export const constrainCar: Constrain = (x, z, step) => {
  const r = resolveCollisions({ x, z, r: CAR_RADIUS }, obstacles, Infinity);
  const b = clampToDriveArea(r.x, r.z, CAR_RADIUS);
  const rigid = r.hits.length > 0 || b.boundary;
  const t = treeWorld.constrain(b.x, b.z, step);
  const p = propWorld.constrain(t.x, t.z, step && t.speed !== undefined ? { ...step, speed: t.speed } : step);
  if (contactLog.enabled || debugLog.enabled) {
    for (const h of r.hits) logContact(h, x, z, r.x, r.z, step, undefined, "rigid obstacle");
    if (b.boundary) logContact("boundary", r.x, r.z, b.x, b.z, step, undefined, "drive-area edge");
    if (t.blocked) logContact("tree", b.x, b.z, t.x, t.z, step, undefined, "standing trunk below topple speed");
    else if (t.speed !== undefined) logContact("tree", b.x, b.z, t.x, t.z, step, t.speed, "trunk yielded");
    if (p.blocked) logContact("prop", t.x, t.z, p.x, p.z, step, undefined, "solid furniture below knock speed");
    else if (p.speed !== undefined) logContact("prop", t.x, t.z, p.x, p.z, step, p.speed, "furniture yielded");
  }
  if (rigid || t.blocked || p.blocked) return { x: p.x, z: p.z, blocked: true };
  const speed = p.speed ?? t.speed;
  return speed !== undefined ? { x: p.x, z: p.z, blocked: false, speed } : { x: p.x, z: p.z, blocked: false };
};
