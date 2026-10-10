import { allPlots } from "@/data/districts";
import { PLATFORM, PLAZA, ROADS, distanceToRoad } from "@/data/world";
import { seededRandom } from "@/lib/seededRandom";
import { insideParkingPad, roadsideExtent } from "./urban";

export type TreeKind = "pine" | "round" | "tiered";

export interface TreeInstance {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  kind: TreeKind;
  /** Index into the canopy colour ramp. */
  tint: number;
}

export interface LampInstance {
  x: number;
  z: number;
  /** Rotation so the arm points toward the road. */
  rotation: number;
}

export interface Placed {
  x: number;
  z: number;
  rotation: number;
  scale?: number;
  tint?: number;
}

export interface Garden {
  x: number;
  z: number;
  radius: number;
}

export interface PropSet {
  trees: TreeInstance[];
  bushes: Placed[];
  gardens: Garden[];
  benches: Placed[];
  planters: Placed[];
  bollards: Placed[];
}

const TREE_SEED = 20261010;
const CANOPY_TINTS = 4;

const PLOTS = allPlots();
function onPlot(x: number, z: number, margin: number): boolean {
  return PLOTS.some((d) => {
    const [cx, cz] = d.position;
    const [w, dpt] = d.footprint;
    return Math.abs(x - cx) < w / 2 + margin && Math.abs(z - cz) < dpt / 2 + margin;
  });
}

function insidePlaza(x: number, z: number, margin: number): boolean {
  return Math.hypot(x, z) < PLAZA.outerRadius + margin;
}

/** Free ground: off roads (and sidewalks), off plots, outside the plaza, off parking pads, inside the island. */
export function isFreeGround(x: number, z: number, roadMargin = 3.2): boolean {
  if (Math.abs(x) > PLATFORM.driveHalfSize - 2 || Math.abs(z) > PLATFORM.driveHalfSize - 2) return false;
  if (distanceToRoad(x, z) < roadMargin) return false;
  if (insidePlaza(x, z, 3)) return false;
  if (onPlot(x, z, 4)) return false;
  if (insideParkingPad(x, z, 1.5)) return false;
  return true;
}

/**
 * Deterministic vegetation: boulevard rows along the roads plus seeded
 * clusters (gardens) in the free quadrants. Never on roads, plots or the plaza.
 */
export function generateTrees(count: number): TreeInstance[] {
  const rand = seededRandom(TREE_SEED);
  const trees: TreeInstance[] = [];
  const tooClose = (x: number, z: number, min: number) => trees.some((t) => Math.hypot(t.x - x, t.z - z) < min);

  // 1) Boulevard rows: both sides of every road, just beyond the sidewalk.
  const offset = roadsideExtent(ROADS[0]!.width) + 1.3;
  for (const r of ROADS) {
    const dx = r.to[0] - r.from[0];
    const dz = r.to[1] - r.from[1];
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    let i = 0;
    for (let s = 6; s < len - 4; s += 9) {
      for (const side of [-1, 1]) {
        const x = r.from[0] + ux * s + -uz * offset * side;
        const z = r.from[1] + uz * s + ux * offset * side;
        if (!isFreeGround(x, z, 3.2) || tooClose(x, z, 4)) continue;
        if (trees.length >= count) break;
        trees.push({ x, z, scale: 0.95 + rand() * 0.25, rotation: rand() * Math.PI * 2, kind: i % 2 === 0 ? "round" : "tiered", tint: (i + (side > 0 ? 1 : 0)) % CANOPY_TINTS });
      }
      i++;
    }
  }

  // 2) Clusters in the free ground.
  let attempts = 0;
  while (trees.length < count && attempts < 400) {
    attempts++;
    const cx = (rand() * 2 - 1) * (PLATFORM.driveHalfSize - 6);
    const cz = (rand() * 2 - 1) * (PLATFORM.driveHalfSize - 6);
    if (!isFreeGround(cx, cz, 6)) continue;
    const n = 3 + Math.floor(rand() * 4);
    const kind: TreeKind = rand() < 0.5 ? "pine" : rand() < 0.5 ? "round" : "tiered";
    const tint = Math.floor(rand() * CANOPY_TINTS);
    for (let k = 0; k < n && trees.length < count; k++) {
      const a = rand() * Math.PI * 2;
      const d = 1.5 + rand() * 3.5;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (!isFreeGround(x, z, 3.2) || tooClose(x, z, 2.4)) continue;
      trees.push({ x, z, scale: 0.7 + rand() * 0.7, rotation: rand() * Math.PI * 2, kind: rand() < 0.75 ? kind : "pine", tint: (tint + (rand() < 0.3 ? 1 : 0)) % CANOPY_TINTS });
    }
  }
  return trees;
}

/** Street lamps on the sidewalk, every `spacing` units, arm toward the road. */
export function generateLamps(spacing = 12, offset = ROADS[0]!.width / 2 + 1.3): LampInstance[] {
  const lamps: LampInstance[] = [];
  for (const r of ROADS) {
    const [ax, az] = r.from;
    const [bx, bz] = r.to;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz;
    const nz = ux;
    for (let s = spacing / 2; s < len; s += spacing) {
      for (const side of [-1, 1]) {
        const x = ax + ux * s + nx * offset * side;
        const z = az + uz * s + nz * offset * side;
        if (distanceToRoad(x, z) < 0.8) continue;
        if (Math.hypot(x, z) < PLAZA.outerRadius + 1) continue;
        if (onPlot(x, z, 1.5)) continue;
        if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 4)) continue;
        // Arm points back toward the road centre line.
        lamps.push({ x, z, rotation: Math.atan2(-nx * side, -nz * side) });
      }
    }
  }
  return lamps;
}

/** Furniture derived from the trees (gardens under clusters) and the plaza. */
export function generateFurniture(trees: TreeInstance[]): Omit<PropSet, "trees"> {
  const rand = seededRandom(TREE_SEED + 1);
  const gardens: Garden[] = [];
  const bushes: Placed[] = [];
  const benches: Placed[] = [];
  const planters: Placed[] = [];
  const bollards: Placed[] = [];

  // Gardens: a turf disc under every group of 3+ trees that are not boulevard trees.
  const used = new Set<number>();
  trees.forEach((t, i) => {
    if (used.has(i)) return;
    const members = trees.map((o, j) => [o, j] as const).filter(([o]) => Math.hypot(o.x - t.x, o.z - t.z) < 5.5);
    if (members.length < 3) return;
    const cx = members.reduce((a, [o]) => a + o.x, 0) / members.length;
    const cz = members.reduce((a, [o]) => a + o.z, 0) / members.length;
    const radius = Math.max(...members.map(([o]) => Math.hypot(o.x - cx, o.z - cz))) + 1.6;
    if (!isFreeGround(cx, cz, 2.5) || radius > 7) return;
    members.forEach(([, j]) => used.add(j));
    gardens.push({ x: cx, z: cz, radius });
    // A few bushes on the garden edge and one bench facing the road.
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = radius * (0.55 + rand() * 0.35);
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (!isFreeGround(x, z, 2.8)) continue;
      bushes.push({ x, z, rotation: rand() * Math.PI * 2, scale: 0.6 + rand() * 0.6, tint: Math.floor(rand() * CANOPY_TINTS) });
    }
    if (rand() < 0.6) {
      const a = rand() * Math.PI * 2;
      const x = cx + Math.cos(a) * (radius - 0.9);
      const z = cz + Math.sin(a) * (radius - 0.9);
      if (isFreeGround(x, z, 2.8)) benches.push({ x, z, rotation: a + Math.PI / 2 });
    }
  });

  // Plaza furniture: planters and benches on the outer sidewalk ring between exits.
  const ringR = PLAZA.outerRadius + 1.6;
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4);
    const x = Math.cos(a) * ringR;
    const z = Math.sin(a) * ringR;
    if (i % 2 === 0) planters.push({ x, z, rotation: -a, scale: 1 });
    else benches.push({ x, z, rotation: -a + Math.PI / 2 });
  }
  // Bollards at each plaza exit, both sides, protecting the crossing.
  for (const [dx, dz] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    const d = PLAZA.outerRadius + 4.4;
    for (const side of [-1, 1]) {
      const nx = -dz * side;
      const nz = dx * side;
      const off = ROADS[0]!.width / 2 + 0.9;
      bollards.push({ x: dx * d + nx * off, z: dz * d + nz * off, rotation: 0 });
      bollards.push({ x: dx * (d - 1.2) + nx * off, z: dz * (d - 1.2) + nz * off, rotation: 0 });
    }
  }
  return { gardens, bushes, benches, planters, bollards };
}
