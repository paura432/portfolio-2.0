import { distanceToCoast, WATER_LEVEL } from "@/data/archipelago";
import { beachAt, beachHeightAlong, beachLocal, SEA_FLOOR_Y, type BeachDefinition } from "@/data/beaches";
import { ramps, rampHeightAt, rampLocal, rampSlopeAt, type RampDefinition } from "@/data/ramps";
import { SKYPORT } from "@/data/skyport";
import { PLATFORM } from "@/data/world";
import { clampToDriveArea, DRIVE_AREAS } from "./obstacles";
import { surfaceAt } from "./surface";

/**
 * Ground height field (V8). The land the car drives on is no longer a flat
 * plane: ramps rise to a lip and beaches slope under the water. This module
 * is the one authority for "how high is the ground here", used by the car's
 * vertical model, the vehicle transformations (water depth), the terrain
 * query of the aircraft and the terrain meshes, so what is seen, driven and
 * sampled is the same surface.
 */
export type TerrainClass = "road" | "pavement" | "grass" | "sand" | "wet-sand" | "shallow-water" | "deep-water" | "ramp" | "sea-floor";

export interface GroundSample {
  /** Ground height (absolute Y). */
  y: number;
  /** Water above the ground (positive under water, negative on dry land). */
  depth: number;
  /** Slope along `heading`: positive when the ground rises ahead (radians). */
  slope: number;
  terrain: TerrainClass;
  ramp: RampDefinition | null;
  /** Beach whose footprint this is (HUD, minimap, recovery points); the transformation rules do not need it. */
  beach: BeachDefinition | null;
  /** V9: on a shore (ground sloping between the built land and the sea floor), whatever the beach list says. */
  shore: boolean;
  /** V9: unit direction toward deeper water (downhill), or null where the ground is flat. */
  seaward: [number, number] | null;
}

/** Depth bands on a beach (water above the sand). */
export const WET_SAND_DEPTH = -0.55;
export const SHALLOW_DEPTH = 0.95;

/** Built land: the city platform, the Skyport slab, and every drive rectangle (quay, causeway, beaches). */
function onLand(x: number, z: number): boolean {
  if (Math.abs(x) <= PLATFORM.halfSize && Math.abs(z) <= PLATFORM.halfSize) return true;
  if (x >= SKYPORT.slab.minX && x <= SKYPORT.slab.maxX && z >= SKYPORT.slab.minZ && z <= SKYPORT.slab.maxZ) return true;
  return !clampToDriveArea(x, z, 0, DRIVE_AREAS).boundary;
}

/** Ramp whose slope is under (x, z), if any. */
export function rampUnder(x: number, z: number): { ramp: RampDefinition; s: number } | null {
  for (const r of ramps) {
    const l = rampLocal(r, x, z);
    if (Math.abs(l.lateral) <= r.width / 2 && l.s > 0 && l.s <= r.length) return { ramp: r, s: l.s };
  }
  return null;
}

export function groundHeightAt(x: number, z: number): number {
  const ru = rampUnder(x, z);
  if (ru) return rampHeightAt(ru.ramp, ru.s);
  const b = beachAt(x, z);
  if (b) {
    const along = beachLocal(b, x, z).along;
    return beachHeightAlong(b, along);
  }
  return onLand(x, z) ? 0 : SEA_FLOOR_Y;
}

/** Water above the ground at (x, z): still-water level minus the ground (waves are ignored on purpose: no flapping). */
export function waterDepthAt(x: number, z: number): number {
  return WATER_LEVEL - groundHeightAt(x, z);
}

export function terrainClassAt(x: number, z: number): TerrainClass {
  if (rampUnder(x, z)) return "ramp";
  const b = beachAt(x, z);
  const depth = waterDepthAt(x, z);
  if (b) {
    if (depth <= WET_SAND_DEPTH) return "sand";
    if (depth <= 0) return "wet-sand";
    return depth <= SHALLOW_DEPTH ? "shallow-water" : "deep-water";
  }
  if (!onLand(x, z)) return depth > SHALLOW_DEPTH ? "deep-water" : "sea-floor";
  const s = surfaceAt(x, z);
  return s === "asphalt" ? "road" : s === "pavement" ? "pavement" : "grass";
}

/**
 * Shore (V9): ground that lies between the built land (y = 0) and the sea
 * floor, i.e. a slope that meets the water. Derived from the height field
 * alone, so every beach stretch, present or future, is a shore without being
 * listed anywhere; ramps (above the land) and the flat platform never are.
 */
export function isShoreAt(x: number, z: number): boolean {
  const y = groundHeightAt(x, z);
  return y < -0.02 && y > SEA_FLOOR_Y + 0.02;
}

/** Unit direction toward deeper water: minus the ground gradient (central differences over 1.2 u). Null on flat ground. */
export function seawardDirectionAt(x: number, z: number): [number, number] | null {
  const e = 0.6;
  const gx = groundHeightAt(x + e, z) - groundHeightAt(x - e, z);
  const gz = groundHeightAt(x, z + e) - groundHeightAt(x, z - e);
  const len = Math.hypot(gx, gz);
  if (len < 1e-4) return null;
  return [-gx / len, -gz / len];
}

/** Velocity component toward deeper water (u/s; negative = toward the land); 0 on flat ground. */
export function seawardSpeedAt(x: number, z: number, vx: number, vz: number): number {
  const d = seawardDirectionAt(x, z);
  return d ? vx * d[0] + vz * d[1] : 0;
}

export function sampleGround(x: number, z: number, heading: number): GroundSample {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const y = groundHeightAt(x, z);
  const ahead = groundHeightAt(x + fx * 0.6, z + fz * 0.6);
  const behind = groundHeightAt(x - fx * 0.6, z - fz * 0.6);
  const ru = rampUnder(x, z);
  // On a slope the analytic derivative is used (the numerical one falls off the lip).
  const slope = ru ? rampSlopeAt(ru.ramp, ru.s) * Math.cos(heading - ru.ramp.heading) : Math.atan2(ahead - behind, 1.2);
  return {
    y,
    depth: WATER_LEVEL - y,
    slope,
    terrain: terrainClassAt(x, z),
    ramp: ru?.ramp ?? null,
    beach: beachAt(x, z),
    shore: isShoreAt(x, z),
    seaward: seawardDirectionAt(x, z),
  };
}

/**
 * Distance to the shore as the ocean sees it: outside the beaches the
 * coastline polygon; inside a beach the sand itself (three units of
 * "distance" per unit of water depth), so the foam band, the shallow colour
 * and the wave damping follow the real waterline on the slope instead of the
 * bay's outline under water.
 */
export function shoreDistanceAt(x: number, z: number): number {
  const b = beachAt(x, z, 1);
  if (b) return waterDepthAt(x, z) * 3;
  return distanceToCoast(x, z);
}
