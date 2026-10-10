import { allPlots, districts } from "@/data/districts";
import { PLATFORM } from "@/data/world";
import { boxFromFootprint, resolveCollisions, type Obstacle } from "../physics/collision";
import type { Constrain } from "../vehicle/carPhysics";
import { treeWorld } from "./treeWorld";

/** Collision shapes derived from district data: one source of truth for visuals and physics. */
export const BUILDING_PADDING = 1.0;

export const CAR_RADIUS = 1.3;
export const DRIVE_HALF_SIZE = PLATFORM.driveHalfSize;

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
];

/**
 * Constraint used by the vehicle each sub-step: buildings and the island edge
 * (rigid), then the trees (rigid when standing, yielding when hit fast enough).
 */
export const constrainCar: Constrain = (x, z, step) => {
  const r = resolveCollisions({ x, z, r: CAR_RADIUS }, obstacles, DRIVE_HALF_SIZE);
  const rigid = r.hits.length > 0 || r.boundary;
  const t = treeWorld.constrain(r.x, r.z, step);
  if (rigid || t.blocked) return { x: t.x, z: t.z, blocked: true };
  return t;
};
