import { WATER_LEVEL } from "@/data/archipelago";
import { SKYPORT_ROOFS } from "@/data/skyport";
import { boxFromFootprint, resolveCollisions, type Obstacle } from "../physics/collision";
import { groundHeightAt, rampUnder } from "../world/ground";
import { CAR_RADIUS, clampToDriveArea, obstacles } from "../world/obstacles";
import type { TerrainQuery } from "./planePhysics";
import { BOAT_ENTER_DEPTH } from "./transformer";

/**
 * Landing rules (V8): where the aircraft may touch down. Open built ground
 * (any drive rectangle, clear of buildings and ramps, dry) rolls out as a
 * car; open water becomes a boat; everything else (buildings, ramps, coast
 * skirts, island terrain) holds an altitude floor above it so the hull never
 * clips a roof or a slope. Pure; shared by the flight step and the HUD's
 * landing-zone sensor.
 */
/** Clearance the hull needs from any building footprint to count as open ground. */
export const LANDING_CLEARANCE = 2.4;
/** Altitude floor over ground the aircraft may not land on, above the local ground. */
export const LANDING_FLOOR = 12;

/** Roofs over otherwise open ground (the hangar floor the car may enter): the aircraft keeps its floor above them. */
const roofs: Obstacle[] = SKYPORT_ROOFS.map((r) => ({ kind: "box", ...boxFromFootprint(r.id, r.position, r.footprint) }));

export function landableAt(x: number, z: number): boolean {
  if (clampToDriveArea(x, z, CAR_RADIUS).boundary) return false;
  if (rampUnder(x, z)) return false;
  if (resolveCollisions({ x, z, r: LANDING_CLEARANCE }, obstacles, Infinity).hits.length > 0) return false;
  if (resolveCollisions({ x, z, r: LANDING_CLEARANCE }, roofs, Infinity).hits.length > 0) return false;
  return WATER_LEVEL - groundHeightAt(x, z) <= 0;
}

export function isSplashdown(x: number, z: number): boolean {
  return WATER_LEVEL - groundHeightAt(x, z) > BOAT_ENTER_DEPTH;
}

export const terrainAt: TerrainQuery = (x, z) => {
  const y = groundHeightAt(x, z);
  if (isSplashdown(x, z)) return { groundY: WATER_LEVEL, canLand: true, floorY: WATER_LEVEL };
  const land = landableAt(x, z);
  return { groundY: y, canLand: land, floorY: land ? y : Math.max(y, 0) + LANDING_FLOOR };
};

/** The ground a few lengths ahead may be landed on (the HUD's "Landing zone detected"). */
export function landingAhead(x: number, z: number, heading: number): boolean {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  return (landableAt(x + fx * 6, z + fz * 6) && landableAt(x + fx * 14, z + fz * 14)) || (isSplashdown(x + fx * 6, z + fz * 6) && isSplashdown(x + fx * 14, z + fz * 14));
}
