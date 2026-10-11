import { QUAY_DRIVE } from "@/data/archipelago";
import { allPlots, districts } from "@/data/districts";
import { PLATFORM } from "@/data/world";
import { boxFromFootprint, resolveCollisions, type Obstacle } from "../physics/collision";
import type { Constrain } from "../vehicle/carPhysics";
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

/**
 * Constraint used by the vehicle each sub-step: buildings (rigid), the drive
 * area boundary (rigid), then the trees (rigid when standing, yielding when hit fast enough).
 */
export const constrainCar: Constrain = (x, z, step) => {
  const r = resolveCollisions({ x, z, r: CAR_RADIUS }, obstacles, Infinity);
  const b = clampToDriveArea(r.x, r.z, CAR_RADIUS);
  const rigid = r.hits.length > 0 || b.boundary;
  const t = treeWorld.constrain(b.x, b.z, step);
  if (rigid || t.blocked) return { x: t.x, z: t.z, blocked: true };
  return t;
};
