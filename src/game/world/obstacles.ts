import { districts } from "@/data/districts";
import { PLATFORM } from "@/data/world";
import { boxFromFootprint, resolveCollisions, type Obstacle } from "../physics/collision";
import type { Constrain } from "../vehicle/carPhysics";

/** Collision shapes derived from district data: one source of truth for visuals and physics. */
export const BUILDING_PADDING = 1.0;

export const CAR_RADIUS = 1.3;
export const DRIVE_HALF_SIZE = PLATFORM.driveHalfSize;

export const obstacles: Obstacle[] = districts
  .filter((d) => d.built)
  .map((d): Obstacle => {
    if (d.kind === "hub") {
      // The hub pavilion is round; its footprint is the diameter.
      return { kind: "round", id: d.id, x: d.position[0], z: d.position[1], r: d.footprint[0] / 2 + BUILDING_PADDING };
    }
    return { kind: "box", ...boxFromFootprint(d.id, d.position, d.footprint, BUILDING_PADDING) };
  });

/** Constraint used by the vehicle each sub-step: buildings plus the island edge. */
export const constrainCar: Constrain = (x, z) => {
  const r = resolveCollisions({ x, z, r: CAR_RADIUS }, obstacles, DRIVE_HALF_SIZE);
  return { x: r.x, z: r.z, blocked: r.hits.length > 0 || r.boundary };
};
