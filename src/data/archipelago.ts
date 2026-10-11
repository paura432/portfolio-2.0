/**
 * Archipelago (V6): islands, coastlines, harbors, docking zones and water.
 * Pure data shared by the 3D world, the boat collisions, the minimap and the
 * tests, so a new island is one entry here and nothing else.
 *
 * Coordinates are world units on the XZ plane (Y is up). +X is east, +Z is south.
 * Headings follow the vehicles: forward = (sin h, 0, cos h); -PI/2 faces west.
 */
import { seededRandom } from "@/lib/seededRandom";
import { SKYPORT, skyportCoastline } from "./skyport";
import { PLATFORM } from "./world";

export type IslandId = "main" | "creative-lab" | "skyport";
export type HarborId = "pau-harbor" | "creative-lab-pier" | "skyport-pier";
export type PoiId = "creative-lab";
export type VehicleId = "car" | "boat";

export type Point = [x: number, z: number];

/** Where a vehicle rests when it is not being driven (parked car, moored boat). */
export interface VehicleSpawn {
  vehicle: VehicleId;
  position: Point;
  heading: number;
}

export interface Zone2D {
  x: number;
  z: number;
  radius: number;
}

export interface HarborDefinition {
  id: HarborId;
  island: IslandId;
  name: string;
  /** Short line under the name (HUD, minimap title). */
  tagline: string;
  /** Pier root on land and the direction the pier runs out to sea. */
  pierRoot: Point;
  pierHeading: number;
  pierLength: number;
  pierWidth: number;
  /** Cars inside this zone, slow enough, may board the boat. */
  boardingZone: Zone2D;
  /** Boats inside this zone, slow enough, may dock. */
  dockingZone: Zone2D;
  /** Where the boat is tied up (also its spawn). */
  mooring: VehicleSpawn;
  /** Land vehicles that live at this harbor (none: the player disembarks onto the pier). */
  landVehicles: VehicleId[];
}

export interface PointOfInterest {
  id: PoiId;
  island: IslandId;
  harbor: HarborId;
  name: string;
  tagline: string;
  /** Building centre, for the 3D marker and the minimap. */
  position: Point;
}

export interface IslandDefinition {
  id: IslandId;
  name: string;
  /** Island centre (minimap label, camera framing). */
  center: Point;
  /** Closed coastline polygon (counter-clockwise on the XZ plane as seen from above). Boats stay outside it. */
  coastline: Point[];
  /** Flat land height (the top of the terrain). */
  landHeight: number;
  harbors: HarborId[];
}

/** Still-water level. The main island's platform top is at 0; its underside skirt is submerged. */
export const WATER_LEVEL = -1.1;

/** Soft navigation boundary: beyond it the boat is pushed back toward the archipelago. */
export const SEA_BOUNDS = { minX: -250, maxX: 250, minZ: -160, maxZ: 160 } as const;

/** Extent of the rendered ocean surface (covers the far plane from anywhere inside SEA_BOUNDS). */
export const OCEAN_EXTENT = { centerX: -65, centerZ: 0, halfWidth: 420, halfDepth: 360 } as const;

/**
 * Main island coastline: the square platform (half size 66) wrapped in an
 * irregular rocky skirt. Generated once from a fixed seed so the visuals, the
 * boat colliders and the minimap agree; the west quay is a straight segment
 * where the harbor sits.
 */
export const MAIN_COAST = {
  /** Where the skirt starts (the platform edge). */
  innerHalf: PLATFORM.halfSize,
  /** Mean distance from the platform edge to the waterline polygon. */
  skirt: 7,
  /** Random variation of the skirt width per vertex. */
  jitter: 3.5,
  segmentsPerSide: 12,
  seed: 6060,
} as const;

/** West quay: a flat extension of the platform where PAU HARBOR's pier starts. */
export const QUAY = {
  /** x range of the quay (from the platform edge out to the pier root). */
  x0: -76,
  x1: -PLATFORM.halfSize,
  z0: -11,
  z1: 11,
} as const;

/** Rectangle the car may drive on in addition to the platform (keeps it 2 u from the quay edge). */
export const QUAY_DRIVE = { minX: QUAY.x0 + 2.5, maxX: -PLATFORM.driveHalfSize, minZ: QUAY.z0 + 2.5, maxZ: QUAY.z1 - 2.5 } as const;

function mainCoastline(): Point[] {
  const { innerHalf, skirt, jitter, segmentsPerSide, seed } = MAIN_COAST;
  const rand = seededRandom(seed);
  const pts: Point[] = [];
  // Walk the square counter-clockwise (seen from above with +X east, +Z south: south → east → north → west edge).
  const sides: { from: Point; to: Point; normal: Point }[] = [
    { from: [-innerHalf, innerHalf], to: [innerHalf, innerHalf], normal: [0, 1] }, // south edge (z = +66)
    { from: [innerHalf, innerHalf], to: [innerHalf, -innerHalf], normal: [1, 0] }, // east edge
    { from: [innerHalf, -innerHalf], to: [-innerHalf, -innerHalf], normal: [0, -1] }, // north edge
    { from: [-innerHalf, -innerHalf], to: [-innerHalf, innerHalf], normal: [-1, 0] }, // west edge
  ];
  for (const side of sides) {
    const west = side.normal[0] === -1;
    let quayDone = false;
    for (let i = 0; i < segmentsPerSide; i++) {
      const t = i / segmentsPerSide;
      const bx = side.from[0] + (side.to[0] - side.from[0]) * t;
      const bz = side.from[1] + (side.to[1] - side.from[1]) * t;
      // Corners bulge a little so the island reads as rounded, not as a box.
      const corner = Math.abs(t - 0.5) * 2;
      const d = skirt + (rand() * 2 - 1) * jitter + corner * corner * 2.5;
      const x = bx + side.normal[0] * d;
      const z = bz + side.normal[1] * d;
      // The west quay is a straight built face: the jittered vertices inside its band are
      // replaced by the two quay corners (the west edge walks from north to south, z increasing).
      if (west && z > QUAY.z0 - 3 && z < QUAY.z1 + 3) {
        if (!quayDone) {
          pts.push([QUAY.x0, QUAY.z0 - 2], [QUAY.x0, QUAY.z1 + 2]);
          quayDone = true;
        }
        continue;
      }
      pts.push([x, z]);
    }
  }
  return pts;
}

function roundIsland(center: Point, radius: number, segments: number, jitter: number, seed: number, flatFacing?: { heading: number; halfWidth: number }): Point[] {
  const rand = seededRandom(seed);
  const pts: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    let r = radius + (rand() * 2 - 1) * jitter;
    // A straighter stretch where the pier lands so the dock reads as a built edge.
    if (flatFacing) {
      const da = Math.abs(Math.atan2(Math.sin(a - flatFacing.heading), Math.cos(a - flatFacing.heading)));
      if (da < flatFacing.halfWidth) r = radius - 1.5;
    }
    // Counter-clockwise from above: x = cos, z = -sin.
    pts.push([center[0] + Math.cos(a) * r, center[1] - Math.sin(a) * r]);
  }
  return pts;
}

export const CREATIVE_LAB_CENTER: Point = [-178, 30];
export const CREATIVE_LAB_RADIUS = 24;

export const islands: IslandDefinition[] = [
  {
    id: "main",
    name: "PAU City",
    center: [0, 0],
    coastline: mainCoastline(),
    landHeight: 0,
    harbors: ["pau-harbor"],
  },
  {
    id: "creative-lab",
    name: "Creative Lab Island",
    center: CREATIVE_LAB_CENTER,
    // The flat stretch faces east (angle 0 → +X), toward the main island.
    coastline: roundIsland(CREATIVE_LAB_CENTER, CREATIVE_LAB_RADIUS, 28, 3.2, 7171, { heading: 0, halfWidth: 0.45 }),
    landHeight: 0.6,
    harbors: ["creative-lab-pier"],
  },
  {
    id: "skyport",
    name: "Skyport Island",
    center: SKYPORT.center,
    coastline: skyportCoastline(),
    landHeight: 0,
    harbors: ["skyport-pier"],
  },
];

export const harbors: HarborDefinition[] = [
  {
    id: "pau-harbor",
    island: "main",
    name: "PAU Harbor",
    tagline: "Boats to the archipelago",
    pierRoot: [QUAY.x0, 0],
    pierHeading: -Math.PI / 2,
    pierLength: 16,
    pierWidth: 5,
    boardingZone: { x: QUAY.x0 + 5, z: 0, radius: 5 },
    dockingZone: { x: QUAY.x0 - 14, z: 7.5, radius: 9 },
    mooring: { vehicle: "boat", position: [QUAY.x0 - 11, 5.0], heading: -Math.PI / 2 },
    landVehicles: ["car"],
  },
  {
    id: "creative-lab-pier",
    island: "creative-lab",
    name: "Creative Lab Pier",
    tagline: "Experimental island",
    // Pier leaves the island's east shore toward the main island.
    pierRoot: [CREATIVE_LAB_CENTER[0] + CREATIVE_LAB_RADIUS - 1.5, CREATIVE_LAB_CENTER[1]],
    pierHeading: Math.PI / 2,
    pierLength: 13,
    pierWidth: 4,
    boardingZone: { x: CREATIVE_LAB_CENTER[0] + CREATIVE_LAB_RADIUS - 5, z: CREATIVE_LAB_CENTER[1], radius: 4 },
    dockingZone: { x: CREATIVE_LAB_CENTER[0] + CREATIVE_LAB_RADIUS + 10, z: CREATIVE_LAB_CENTER[1] + 6.5, radius: 8.5 },
    mooring: { vehicle: "boat", position: [CREATIVE_LAB_CENTER[0] + CREATIVE_LAB_RADIUS + 8, CREATIVE_LAB_CENTER[1] + 4.5], heading: Math.PI / 2 },
    landVehicles: [],
  },
  {
    id: "skyport-pier",
    island: "skyport",
    name: "Skyport Pier",
    tagline: "Boats to the aerial district",
    // Leaves the island's south shore; heading 0 = +Z (south).
    pierRoot: [SKYPORT.center[0], SKYPORT.slab.maxZ + 4],
    pierHeading: 0,
    pierLength: 12,
    pierWidth: 4,
    boardingZone: { x: SKYPORT.center[0], z: SKYPORT.slab.maxZ - 3.5, radius: 4.5 },
    dockingZone: { x: SKYPORT.center[0] + 6, z: SKYPORT.slab.maxZ + 18, radius: 8.5 },
    mooring: { vehicle: "boat", position: [SKYPORT.center[0] + 4.5, SKYPORT.slab.maxZ + 14], heading: 0 },
    landVehicles: ["car"],
  },
];

export const pointsOfInterest: PointOfInterest[] = [
  {
    id: "creative-lab",
    island: "creative-lab",
    harbor: "creative-lab-pier",
    name: "Creative Lab",
    tagline: "Experimental island · content pending",
    position: [CREATIVE_LAB_CENTER[0] - 2, CREATIVE_LAB_CENTER[1] - 3],
  },
];

export function getIsland(id: IslandId): IslandDefinition {
  const i = islands.find((x) => x.id === id);
  if (!i) throw new Error(`Unknown island: ${id}`);
  return i;
}

export function getHarbor(id: HarborId): HarborDefinition {
  const h = harbors.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown harbor: ${id}`);
  return h;
}

export function getPoi(id: PoiId): PointOfInterest {
  const p = pointsOfInterest.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown point of interest: ${id}`);
  return p;
}

/** The pier deck as an axis-aligned box on the XZ plane (boat collider, car boundary, minimap). */
export function pierBox(h: HarborDefinition): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const fx = Math.sin(h.pierHeading);
  const fz = Math.cos(h.pierHeading);
  const ex = h.pierRoot[0] + fx * h.pierLength;
  const ez = h.pierRoot[1] + fz * h.pierLength;
  const hw = h.pierWidth / 2;
  const alongX = Math.abs(fx) > Math.abs(fz);
  return {
    minX: Math.min(h.pierRoot[0], ex) - (alongX ? 0 : hw),
    maxX: Math.max(h.pierRoot[0], ex) + (alongX ? 0 : hw),
    minZ: Math.min(h.pierRoot[1], ez) - (alongX ? hw : 0),
    maxZ: Math.max(h.pierRoot[1], ez) + (alongX ? hw : 0),
  };
}

/** Point-in-polygon (even-odd rule). */
export function insidePolygon(poly: readonly Point[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Signed distance to a polygon: negative inside, positive outside. */
export function polygonDistance(poly: readonly Point[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j]!;
    const [bx, bz] = poly[i]!;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + dx * t;
    const pz = az + dz * t;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return insidePolygon(poly, x, z) ? -best : best;
}

/** Distance from a point to the nearest coastline of any island (0 or negative on land). */
export function distanceToCoast(x: number, z: number): number {
  let best = Infinity;
  for (const i of islands) best = Math.min(best, polygonDistance(i.coastline, x, z));
  return best;
}
