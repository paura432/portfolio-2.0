import { districts } from "@/data/districts";
import { PLATFORM, PLAZA, ROADS, distanceToRoad } from "@/data/world";
import { seededRandom } from "@/lib/seededRandom";

export interface TreeInstance {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface LampInstance {
  x: number;
  z: number;
}

const TREE_SEED = 20261010;

/** Deterministic tree placement: off roads, off every district plot, outside the plaza. */
export function generateTrees(count: number): TreeInstance[] {
  const rand = seededRandom(TREE_SEED);
  const trees: TreeInstance[] = [];
  const limit = PLATFORM.driveHalfSize - 2;
  let attempts = 0;
  while (trees.length < count && attempts < count * 40) {
    attempts++;
    const x = (rand() * 2 - 1) * limit;
    const z = (rand() * 2 - 1) * limit;
    if (distanceToRoad(x, z) < 3.2) continue;
    if (Math.hypot(x, z) < PLAZA.outerRadius + 3) continue;
    const onPlot = districts.some((d) => {
      const [cx, cz] = d.position;
      const [w, dpt] = d.footprint;
      return Math.abs(x - cx) < w / 2 + 4 && Math.abs(z - cz) < dpt / 2 + 4;
    });
    if (onPlot) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    trees.push({ x, z, scale: 0.75 + rand() * 0.6, rotation: rand() * Math.PI * 2 });
  }
  return trees;
}

/** Lamps along both sides of each road segment, every `spacing` units. */
export function generateLamps(spacing = 12, offset = 4.6): LampInstance[] {
  const lamps: LampInstance[] = [];
  for (const r of ROADS) {
    const [ax, az] = r.from;
    const [bx, bz] = r.to;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    // Normal to the road direction.
    const nx = -uz;
    const nz = ux;
    for (let s = spacing / 2; s < len; s += spacing) {
      for (const side of [-1, 1]) {
        const x = ax + ux * s + nx * offset * side;
        const z = az + uz * s + nz * offset * side;
        // Skip lamps that would land on another road, inside the plaza or on a plot.
        if (distanceToRoad(x, z) < 0.8) continue;
        if (Math.hypot(x, z) < PLAZA.outerRadius + 1) continue;
        const onPlot = districts.some((d) => {
          const [cx, cz] = d.position;
          const [w, dpt] = d.footprint;
          return Math.abs(x - cx) < w / 2 + 1.5 && Math.abs(z - cz) < dpt / 2 + 1.5;
        });
        if (onPlot) continue;
        if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 4)) continue;
        lamps.push({ x, z });
      }
    }
  }
  return lamps;
}
