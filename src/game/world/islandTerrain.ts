import { PLATFORM } from "@/data/world";
import { QUAY, WATER_LEVEL, type Point } from "@/data/archipelago";
import { beachLocal, beachHeightAlong, BEACH_RUNOUT, insideBeach, beaches, type BeachDefinition } from "@/data/beaches";
import { seededRandom } from "@/lib/seededRandom";

/**
 * Low-poly island terrain (V6). Pure geometry builders over the coastline
 * polygons from the archipelago data, so the land the player sees is the
 * same outline the boat collides with.
 *
 * Two shapes: a full island (rings scaled from the coast polygon down to the
 * centre, with a radial height profile) and the main island's coastal skirt
 * (rings between the square platform edge and the coast polygon, descending
 * under the water). Vertex colours carry the material zones: sea floor,
 * rock, sand, turf.
 */
export interface TerrainMesh {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export const TERRAIN_COLORS = {
  seaFloor: "#0F1A27",
  rock: "#1F2E3D",
  sand: "#3E4A55",
  turf: "#153538",
  turfLight: "#1B4744",
  /** Inner edge of the main coast skirt: between the ground texture and the sand so the seam reads as a slope, not a cliff. */
  ground: "#1F2E3E",
} as const;

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Colour by height above the water, relative to the land height. */
export function colorForHeight(y: number, landHeight: number): [number, number, number] {
  const above = y - WATER_LEVEL;
  if (above < -1.2) return hex(TERRAIN_COLORS.seaFloor);
  if (above < 0.05) return lerp3(hex(TERRAIN_COLORS.seaFloor), hex(TERRAIN_COLORS.rock), (above + 1.2) / 1.25);
  if (above < 0.55) return lerp3(hex(TERRAIN_COLORS.rock), hex(TERRAIN_COLORS.sand), (above - 0.05) / 0.5);
  const turfT = Math.max(0, Math.min(1, (y - landHeight) / 2.2));
  return lerp3(hex(TERRAIN_COLORS.turf), hex(TERRAIN_COLORS.turfLight), turfT);
}

/** Rings of a full island, from the submerged skirt (scale > 1) to the centre (scale 0). */
export interface RingSpec {
  /** Scale of the coast polygon (1 = waterline polygon). */
  scale: number;
  /** Height of the ring (absolute Y). */
  y: number;
}

export function islandRings(landHeight: number): RingSpec[] {
  return [
    { scale: 1.16, y: WATER_LEVEL - 3.2 },
    { scale: 1.0, y: WATER_LEVEL - 0.55 },
    { scale: 0.93, y: WATER_LEVEL + 0.3 },
    { scale: 0.86, y: landHeight + 0.05 },
    { scale: 0.72, y: landHeight + 0.55 },
    { scale: 0.55, y: landHeight + 1.25 },
    { scale: 0.36, y: landHeight + 1.75 },
    { scale: 0.18, y: landHeight + 1.95 },
  ];
}

/** Height of the island's radial profile at a normalised radius s (0 centre … 1 waterline polygon). */
export function islandProfileHeight(s: number, landHeight: number, rings: RingSpec[] = islandRings(landHeight)): number {
  // Rings run from the outside in; interpolate between the two that bracket s.
  const sorted = [...rings].sort((a, b) => b.scale - a.scale);
  if (s >= sorted[0]!.scale) return sorted[0]!.y;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (s <= a.scale && s >= b.scale) {
      const t = a.scale === b.scale ? 0 : (a.scale - s) / (a.scale - b.scale);
      return a.y + (b.y - a.y) * t;
    }
  }
  return sorted[sorted.length - 1]!.y;
}

/** Radius of the coast polygon in a direction (angle from +X toward -Z, matching `roundIsland`). */
export function coastRadiusAt(coast: readonly Point[], center: Point, angle: number): number {
  // Find the two polygon vertices bracketing the angle and interpolate their radii.
  const n = coast.length;
  const items = coast.map(([x, z]) => {
    const a = Math.atan2(-(z - center[1]), x - center[0]);
    return { a, r: Math.hypot(x - center[0], z - center[1]) };
  });
  let best = items[0]!;
  let bestNext = items[1 % n]!;
  let bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const a = items[i]!;
    const b = items[(i + 1) % n]!;
    let da = angle - a.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    let span = b.a - a.a;
    span = Math.atan2(Math.sin(span), Math.cos(span));
    if (span === 0) continue;
    const t = da / span;
    if (t >= -1e-6 && t <= 1 + 1e-6) {
      const d = Math.abs(t - 0.5);
      if (d < bestD) {
        bestD = d;
        best = a;
        bestNext = b;
      }
    }
  }
  let da = angle - best.a;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  let span = bestNext.a - best.a;
  span = Math.atan2(Math.sin(span), Math.cos(span));
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, da / span));
  return best.r + (bestNext.r - best.r) * t;
}

/** Terrain height at a world point of a round island (profile only; the mesh adds a little noise). */
export function islandHeightAt(coast: readonly Point[], center: Point, landHeight: number, x: number, z: number): number {
  const angle = Math.atan2(-(z - center[1]), x - center[0]);
  const r = coastRadiusAt(coast, center, angle);
  const s = r === 0 ? 0 : Math.hypot(x - center[0], z - center[1]) / r;
  return islandProfileHeight(s, landHeight);
}

function pushTri(out: number[], a: number, b: number, c: number) {
  out.push(a, b, c);
}

/**
 * Full island: concentric rings scaled from the coast polygon plus a centre
 * vertex. Ring vertices keep the polygon's irregularity; heights follow the
 * profile with seeded noise so the slopes read as rock, not as a cone.
 */
export function buildIslandTerrain(coast: readonly Point[], center: Point, landHeight: number, seed: number): TerrainMesh {
  const rand = seededRandom(seed);
  const rings = islandRings(landHeight);
  const n = coast.length;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    for (let i = 0; i < n; i++) {
      const [cx, cz] = coast[i]!;
      const jitter = r === 1 ? 0 : (rand() * 2 - 1) * 0.06; // the waterline ring is the exact collider
      const sc = ring.scale * (1 + jitter);
      const x = center[0] + (cx - center[0]) * sc;
      const z = center[1] + (cz - center[1]) * sc;
      const noise = r === 0 || r === 1 ? 0 : (rand() * 2 - 1) * (0.1 + 0.12 * (1 - ring.scale));
      const y = ring.y + noise;
      positions.push(x, y, z);
      colors.push(...colorForHeight(y, landHeight));
    }
  }
  const centreIndex = positions.length / 3;
  positions.push(center[0], landHeight + 2.05, center[1]);
  colors.push(...colorForHeight(landHeight + 2.05, landHeight));
  // Quads between consecutive rings (outer ring index r, inner r + 1).
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i;
      const b = r * n + ((i + 1) % n);
      const c = (r + 1) * n + i;
      const d = (r + 1) * n + ((i + 1) % n);
      // Winding chosen so the face normals point up (+Y) with the polygons' orientation.
      pushTri(indices, a, b, c);
      pushTri(indices, b, d, c);
    }
  }
  const last = rings.length - 1;
  for (let i = 0; i < n; i++) {
    pushTri(indices, last * n + i, last * n + ((i + 1) % n), centreIndex);
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), indices: new Uint32Array(indices) };
}

/**
 * Main island coastal skirt: from the square platform edge (y ≈ 0) out to the
 * coast polygon (just under the water) and a submerged sea-floor ring beyond.
 * The quay face is skipped: the quay slab stands there.
 */
export function buildCoastSkirt(
  coast: readonly Point[],
  seed: number,
  /** Projects a coast vertex onto the built edge the skirt starts from (default: the city's square platform). */
  clampInner: (x: number, z: number) => [number, number] = (x, z) => [Math.max(-PLATFORM.halfSize, Math.min(PLATFORM.halfSize, x)), Math.max(-PLATFORM.halfSize, Math.min(PLATFORM.halfSize, z))],
  /** Faces to leave out besides the quay face (default: the beach bands, covered by `buildBeachTerrain`). */
  skipFace: (a: Point, b: Point) => boolean = (a, b) => beaches.some((bc) => insideBeach(bc, a[0], a[1], 0.3) && insideBeach(bc, b[0], b[1], 0.3)),
): TerrainMesh {
  const rand = seededRandom(seed);
  const n = coast.length;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rings: { scale: number; y: number; color: (y: number) => [number, number, number] }[] = [
    { scale: 0, y: -0.03, color: () => hex(TERRAIN_COLORS.ground) },
    { scale: 0.55, y: -0.5, color: () => hex(TERRAIN_COLORS.sand) },
    { scale: 1.0, y: WATER_LEVEL - 0.5, color: () => hex(TERRAIN_COLORS.rock) },
    { scale: 1.0, y: WATER_LEVEL - 3.4, color: () => hex(TERRAIN_COLORS.seaFloor) },
  ];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    for (let i = 0; i < n; i++) {
      const [cx, cz] = coast[i]!;
      const [ix, iz] = clampInner(cx, cz);
      // The last ring sits further out (sea floor), the others interpolate inner → coast.
      const extra = r === rings.length - 1 ? 1.35 : 1;
      let x = ix + (cx - ix) * ring.scale * extra;
      let z = iz + (cz - iz) * ring.scale * extra;
      if (r === 1) {
        x += (rand() * 2 - 1) * 0.6;
        z += (rand() * 2 - 1) * 0.6;
      }
      const y = ring.y + (r === 1 || r === 2 ? (rand() * 2 - 1) * 0.12 : 0);
      positions.push(x, y, z);
      colors.push(...ring.color(y));
    }
  }
  const isQuayFace = (i: number) => {
    const a = coast[i]!;
    const b = coast[(i + 1) % n]!;
    return a[0] === QUAY.x0 && b[0] === QUAY.x0;
  };
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      if (isQuayFace(i) || skipFace(coast[i]!, coast[(i + 1) % n]!)) continue;
      const a = r * n + i;
      const b = r * n + ((i + 1) % n);
      const c = (r + 1) * n + i;
      const d = (r + 1) * n + ((i + 1) % n);
      // Inner ring (r) to outer ring (r + 1); winding so the faces point up.
      pushTri(indices, a, c, b);
      pushTri(indices, b, c, d);
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), indices: new Uint32Array(indices) };
}

export interface RockInstance {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
}

/** Rocks scattered along a coastline, half submerged, skipping the quay face and the pier gap. */
export function coastRocks(coast: readonly Point[], seed: number, options: { skip?: (x: number, z: number) => boolean; density?: number } = {}): RockInstance[] {
  const rand = seededRandom(seed);
  const rocks: RockInstance[] = [];
  const density = options.density ?? 1.4;
  const n = coast.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = coast[i]!;
    const [bx, bz] = coast[(i + 1) % n]!;
    const count = Math.round(density * (0.5 + rand()));
    for (let k = 0; k < count; k++) {
      const t = rand();
      const x = ax + (bx - ax) * t + (rand() * 2 - 1) * 1.6;
      const z = az + (bz - az) * t + (rand() * 2 - 1) * 1.6;
      if (options.skip?.(x, z)) continue;
      rocks.push({ x, y: WATER_LEVEL - 0.35 + rand() * 0.3, z, scale: 0.7 + rand() * 1.5, rotation: rand() * Math.PI * 2 });
    }
  }
  return rocks;
}

/**
 * Beach strip (V8): a grid over the beach footprint whose heights come from
 * `beachHeightAlong`, the same function the car's ground height field uses,
 * coloured by depth: dry sand, wet sand at the waterline, sea floor under
 * the water. Replaces the coast skirt faces inside the beach band.
 */
export const BEACH_COLORS = { dry: "#5E5744", wet: "#45453C", shallow: "#2C3A46" } as const;

export function buildBeachTerrain(b: BeachDefinition, seed: number): TerrainMesh {
  const rand = seededRandom(seed);
  const width = beachLocal(b, b.edge.to[0], b.edge.to[1]).across;
  const along0 = -5;
  const along1 = b.length + BEACH_RUNOUT + 2;
  const nAcross = 8;
  const nAlong = 26;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const ex = (b.edge.to[0] - b.edge.from[0]) / width;
  const ez = (b.edge.to[1] - b.edge.from[1]) / width;
  for (let j = 0; j <= nAlong; j++) {
    const along = along0 + ((along1 - along0) * j) / nAlong;
    for (let i = 0; i <= nAcross; i++) {
      const across = -1 + ((width + 2) * i) / nAcross;
      const x = b.edge.from[0] + ex * across + b.seaward[0] * along;
      const z = b.edge.from[1] + ez * across + b.seaward[1] * along;
      const edge = i === 0 || i === nAcross;
      const noise = along > 1 && !edge ? (rand() * 2 - 1) * 0.05 : 0;
      const y = beachHeightAlong(b, along) + noise - (along <= 0 ? 0.02 : 0);
      positions.push(x, y, z);
      const depth = WATER_LEVEL - y;
      const c = depth <= -0.55 ? hex(BEACH_COLORS.dry) : depth <= 0 ? lerp3(hex(BEACH_COLORS.dry), hex(BEACH_COLORS.wet), (depth + 0.55) / 0.55) : depth <= 1.2 ? lerp3(hex(BEACH_COLORS.wet), hex(BEACH_COLORS.shallow), depth / 1.2) : lerp3(hex(BEACH_COLORS.shallow), hex(TERRAIN_COLORS.seaFloor), Math.min(1, (depth - 1.2) / 2));
      colors.push(...c);
    }
  }
  const stride = nAcross + 1;
  for (let j = 0; j < nAlong; j++) {
    for (let i = 0; i < nAcross; i++) {
      const a = j * stride + i;
      const bb = a + 1;
      const c = a + stride;
      const d = c + 1;
      // Winding: faces up for a seaward axis that is (0,1) or (1,0) with the across axis to its left.
      const cross = ex * b.seaward[1] - ez * b.seaward[0];
      if (cross < 0) {
        pushTri(indices, a, bb, c);
        pushTri(indices, bb, d, c);
      } else {
        pushTri(indices, a, c, bb);
        pushTri(indices, bb, c, d);
      }
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), indices: new Uint32Array(indices) };
}
