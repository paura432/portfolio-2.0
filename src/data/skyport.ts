/**
 * Skyport Island (V7): the aerial district east of the city, reached by car
 * over a causeway from the east cross road, and by boat at its south pier.
 * Pure layout data shared by the 3D scene, the car colliders, the flight
 * rules (pad, runway, landing floor) and the minimap.
 *
 * Coordinates are world units on the XZ plane. The island is a flat slab at
 * y = 0 like the city platform, so the car drives straight onto it.
 */
import type { Point } from "./archipelago";
import type { Runway } from "@/game/vehicle/transform";

export const SKYPORT = {
  id: "skyport" as const,
  name: "Skyport",
  tagline: "Runway · launch ramp · landing strip",
  /** Island slab (flat top at y = 0). */
  slab: { minX: 104, maxX: 202, minZ: -36, maxZ: 36 },
  center: [153, 0] as Point,
  /** Causeway from the city's east coast to the island: a bridge deck on piles with the road on top. */
  causeway: { fromX: 66, toX: 104, z: 0, width: 13 },
  /** Transformation pad: the car stops here (on the runway threshold) and folds out. */
  pad: { x: 124, z: -9, radius: 5.5 },
  /** Runway heading east: takeoff and landing both run over the open sea beyond the island. */
  runway: { id: "skyport", minX: 118, maxX: 198, minZ: -14, maxZ: -4, y: 0, heading: Math.PI / 2 } satisfies Runway,
  /** Minimum altitude outside the runway (above buildings and masts). */
  floorY: 16,
  /** Where the aircraft is put back by "Reset" (on the pad, heading down the runway). */
  spawn: { x: 124, z: -9, heading: Math.PI / 2 },
  hangar: { x: 142, z: 18, w: 18, d: 13, h: 7.5 },
  tower: { x: 118, z: 16, w: 5, d: 5, h: 15 },
  terminal: { x: 170, z: 20, w: 14, d: 9, h: 4.5 },
  /** Runway edge lights every `pitch` units on both sides. */
  lightPitch: 8,
  /** Approach lights on piles into the sea off the east threshold. */
  approachLights: [206, 212, 218, 224],
} as const;

/** Road segments the island adds to the network (asphalt, curbs, lamps and the car's road feel come for free). */
export const SKYPORT_ROADS: { from: Point; to: Point }[] = [
  { from: [40, 0], to: [114, 0] }, // east cross road → causeway → island apron
  { from: [114, 0], to: [114, -9] },
  { from: [114, -9], to: [122, -9] }, // onto the runway threshold / pad
];

/** Rectangles the car may drive on besides the city platform and the harbor quay. */
export const SKYPORT_DRIVE_RECTS = [
  { minX: 56, maxX: 112, minZ: -4, maxZ: 4 }, // causeway (reaches 6 u into the platform's drive area: no seam trap)
  { minX: 106, maxX: 200, minZ: -33, maxZ: 33 }, // island slab
];

/** Wall thickness of the hangar's shell (its front toward the runway is open). */
export const HANGAR_WALL = 0.6;

/**
 * Buildings the car (and the aircraft on the ground) must not drive through.
 * V9: the colliders follow the drawn geometry. The hangar is a compound of its
 * three walls, so the car can drive into the open front instead of hitting an
 * invisible facade; the tower collides as its shaft (the cab overhangs far
 * above the car).
 */
export const SKYPORT_OBSTACLES: { id: string; position: Point; footprint: [number, number] }[] = [
  { id: "skyport-hangar-back", position: [SKYPORT.hangar.x, SKYPORT.hangar.z + SKYPORT.hangar.d / 2 - HANGAR_WALL / 2], footprint: [SKYPORT.hangar.w, HANGAR_WALL] },
  { id: "skyport-hangar-left", position: [SKYPORT.hangar.x - SKYPORT.hangar.w / 2 + HANGAR_WALL / 2, SKYPORT.hangar.z], footprint: [HANGAR_WALL, SKYPORT.hangar.d] },
  { id: "skyport-hangar-right", position: [SKYPORT.hangar.x + SKYPORT.hangar.w / 2 - HANGAR_WALL / 2, SKYPORT.hangar.z], footprint: [HANGAR_WALL, SKYPORT.hangar.d] },
  { id: "skyport-tower", position: [SKYPORT.tower.x, SKYPORT.tower.z], footprint: [SKYPORT.tower.w - 1.2, SKYPORT.tower.d - 1.2] },
  { id: "skyport-terminal", position: [SKYPORT.terminal.x, SKYPORT.terminal.z], footprint: [SKYPORT.terminal.w, SKYPORT.terminal.d] },
];

/** Roofed footprints the aircraft may never land on even where the car can drive in (the hangar's whole floor). */
export const SKYPORT_ROOFS: { id: string; position: Point; footprint: [number, number] }[] = [
  { id: "skyport-hangar", position: [SKYPORT.hangar.x, SKYPORT.hangar.z], footprint: [SKYPORT.hangar.w + 0.8, SKYPORT.hangar.d + 0.8] },
];

/** Island coastline: a rounded rectangle around the slab (boat collider and skirt), straight on the causeway side. */
export function skyportCoastline(): Point[] {
  const { minX, maxX, minZ, maxZ } = SKYPORT.slab;
  const skirt = 6;
  const r = 14;
  const pts: Point[] = [];
  const corner = (cx: number, cz: number, a0: number, a1: number) => {
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + Math.cos(a) * (r + skirt), cz + Math.sin(a) * (r + skirt)]);
    }
  };
  // Same winding as the other islands (south edge west→east, then east, north, west edges):
  corner(minX + r, maxZ - r, Math.PI, Math.PI * 0.5); // SW: from west (π) to south (π/2)
  corner(maxX - r, maxZ - r, Math.PI * 0.5, 0); // SE: south → east
  corner(maxX - r, minZ + r, 0, -Math.PI * 0.5); // NE: east → north
  corner(minX + r, minZ + r, -Math.PI * 0.5, -Math.PI); // NW: north → west
  return pts;
}

export function insideSkyportPad(x: number, z: number): boolean {
  return Math.hypot(x - SKYPORT.pad.x, z - SKYPORT.pad.z) <= SKYPORT.pad.radius;
}

/** Edge-light positions along the runway (both sides) and the threshold bars. */
export function runwayLights(): { x: number; z: number; kind: "edge" | "threshold" | "approach" }[] {
  const r = SKYPORT.runway;
  const out: { x: number; z: number; kind: "edge" | "threshold" | "approach" }[] = [];
  for (let x = r.minX + 4; x <= r.maxX - 4; x += SKYPORT.lightPitch) {
    out.push({ x, z: r.minZ - 0.6, kind: "edge" }, { x, z: r.maxZ + 0.6, kind: "edge" });
  }
  for (let z = r.minZ + 1; z <= r.maxZ - 1; z += 2) {
    out.push({ x: r.minX + 0.8, z, kind: "threshold" }, { x: r.maxX - 0.8, z, kind: "threshold" });
  }
  for (const x of SKYPORT.approachLights) out.push({ x, z: (r.minZ + r.maxZ) / 2, kind: "approach" });
  return out;
}
