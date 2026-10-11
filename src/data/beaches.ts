/**
 * Beaches (V8): stretches of an island's edge where the built ground turns
 * into a sand slope that runs under the water. Pure data shared by the
 * terrain meshes, the coastline polygons, the car's ground height, the boat
 * colliders, the transformation rules and the minimap.
 *
 * A beach is a segment of the island edge plus a seaward direction: the sand
 * descends linearly from the edge (land height) to `drop` below it at
 * `length`, then falls to the sea floor. The car drives down it; where the
 * water gets deep enough the vehicle becomes a boat, and a boat sailing up it
 * becomes a car again.
 */
import { PLATFORM } from "./world";
import { SKYPORT } from "./skyport";

export type Point = [x: number, z: number];
export type BeachId = "south-beach" | "east-beach" | "skyport-beach";

export interface BeachDefinition {
  id: BeachId;
  name: string;
  island: "main" | "skyport";
  /** Segment of the island's built edge the sand starts from. */
  edge: { from: Point; to: Point };
  /** Unit direction from the edge toward the sea. */
  seaward: Point;
  /** Length of the sand slope. */
  length: number;
  /** How far below the edge the sand is at `length`. */
  drop: number;
  /** Height of the island's built edge (the top of the platform / slab). */
  landHeight: number;
}

/** Past the slope the sand keeps falling to the sea floor over this distance. */
export const BEACH_RUNOUT = 8;
export const SEA_FLOOR_Y = -4.2;

export const beaches: BeachDefinition[] = [
  {
    id: "south-beach",
    name: "South Beach",
    island: "main",
    edge: { from: [12, PLATFORM.halfSize], to: [40, PLATFORM.halfSize] },
    seaward: [0, 1],
    length: 18,
    drop: 2.6,
    landHeight: 0,
  },
  {
    id: "east-beach",
    name: "East Beach",
    island: "main",
    edge: { from: [PLATFORM.halfSize, 14], to: [PLATFORM.halfSize, 42] },
    seaward: [1, 0],
    length: 18,
    drop: 2.6,
    landHeight: 0,
  },
  {
    id: "skyport-beach",
    name: "Skyport Beach",
    island: "skyport",
    edge: { from: [112, SKYPORT.slab.maxZ], to: [138, SKYPORT.slab.maxZ] },
    seaward: [0, 1],
    length: 16,
    drop: 2.6,
    landHeight: 0,
  },
];

export function getBeach(id: BeachId): BeachDefinition {
  const b = beaches.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown beach: ${id}`);
  return b;
}

/** Position relative to the beach: `along` from the edge toward the sea (negative on land), `across` from the edge's start (0..width). */
export function beachLocal(b: BeachDefinition, x: number, z: number): { along: number; across: number; width: number } {
  const ex = b.edge.to[0] - b.edge.from[0];
  const ez = b.edge.to[1] - b.edge.from[1];
  const width = Math.hypot(ex, ez);
  const ux = ex / width;
  const uz = ez / width;
  const dx = x - b.edge.from[0];
  const dz = z - b.edge.from[1];
  return { along: dx * b.seaward[0] + dz * b.seaward[1], across: dx * ux + dz * uz, width };
}

/** Inside the beach's footprint: the sand slope, its run-out and the shallow water in front, `margin` wider on every side. */
export function insideBeach(b: BeachDefinition, x: number, z: number, margin = 0): boolean {
  const l = beachLocal(b, x, z);
  return l.across >= -margin && l.across <= l.width + margin && l.along >= -margin && l.along <= b.length + BEACH_RUNOUT + margin;
}

/** Sand height at a distance `along` from the edge (independent of `across`: the beach is a plane strip). */
export function beachHeightAlong(b: BeachDefinition, along: number): number {
  if (along <= 0) return b.landHeight;
  if (along <= b.length) {
    // Eased start so the car tips over the edge instead of hitting a crease.
    const t = along / b.length;
    const ease = t < 0.15 ? (t * t) / 0.15 / 2 + t * 0.5 : t;
    return b.landHeight - b.drop * Math.min(1, ease);
  }
  const u = Math.min(1, (along - b.length) / BEACH_RUNOUT);
  return b.landHeight - b.drop + (SEA_FLOOR_Y - (b.landHeight - b.drop)) * u;
}

export function beachAt(x: number, z: number, margin = 0): BeachDefinition | null {
  for (const b of beaches) if (insideBeach(b, x, z, margin)) return b;
  return null;
}

/** Outer corners of the beach footprint in world space (the coastline bulges out to them). */
export function beachOuterCorners(b: BeachDefinition): [Point, Point] {
  const out = b.length + BEACH_RUNOUT * 0.5;
  return [
    [b.edge.from[0] + b.seaward[0] * out, b.edge.from[1] + b.seaward[1] * out],
    [b.edge.to[0] + b.seaward[0] * out, b.edge.to[1] + b.seaward[1] * out],
  ];
}

/** Axis-aligned rectangle the car may drive on for this beach (edge → run-out, plus a little slack into the island). */
export function beachDriveRect(b: BeachDefinition): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const [c0, c1] = beachOuterCorners(b);
  const [d0, d1] = [b.edge.from, b.edge.to];
  const inland = 8; // overlaps the island drive area by more than a car diameter: no seam trap
  const xs = [c0[0], c1[0], d0[0] - b.seaward[0] * inland, d1[0] - b.seaward[0] * inland];
  const zs = [c0[1], c1[1], d0[1] - b.seaward[1] * inland, d1[1] - b.seaward[1] * inland];
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}
