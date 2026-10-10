import { generateTrees, type TreeInstance, type TreeKind } from "./props";

/**
 * Tree identity and spatial lookup.
 *
 * The deterministic list from `generateTrees` is generated once, in full, and
 * every tree gets a stable `id` = its index in that list. Quality tiers render
 * a prefix of the list (`visibleTreeCount`), species are split per instanced
 * mesh, and neither changes the id, so dynamic state (shaking, fallen…) keyed by
 * id survives HIGH ↔ MEDIUM ↔ LOW and never leaks onto a neighbour.
 */
export const TREE_COUNT = 140;

export interface TreeDef extends TreeInstance {
  /** Stable identity: index in the full deterministic list. */
  id: number;
}

let cache: TreeDef[] | null = null;

/** The full deterministic tree list with ids (memoised; the data never changes). */
export function treeDefs(): TreeDef[] {
  if (!cache) cache = generateTrees(TREE_COUNT).map((t, id): TreeDef => ({ ...t, id }));
  return cache;
}

/** How many trees (a prefix of the list) a vegetation fraction renders. */
export function visibleTreeCount(fraction: number, total = TREE_COUNT): number {
  return Math.max(0, Math.min(total, Math.round(total * fraction)));
}

/** Trunk geometry: cylinder radius 0.16 (top) → 0.26 (base), height 1.4, centred at 0.7, all × scale. */
export const TRUNK_HEIGHT = 1.4;
export const TRUNK_RADIUS_BASE = 0.26;

/** Collider radius of a standing trunk (slightly wider than the mesh so the car reads the contact). */
export function trunkRadius(scale: number): number {
  return 0.34 * scale + 0.1;
}

/** Height of the canopy top above ground (used for the fall pose and the pivot). */
export function treeHeight(kind: TreeKind, scale: number): number {
  switch (kind) {
    case "pine":
      return (2.6 + 1.55 * 1.05) * scale;
    case "round":
      return (2.5 + 1.35 * 1.25) * scale;
    case "tiered":
      return (3.2 + 0.95 * 0.9) * scale;
  }
}

/** Uniform grid over XZ for "trees near this point" queries; cells never move. */
export class TreeGrid {
  private readonly cells = new Map<number, number[]>();
  readonly maxRadius: number;

  constructor(
    readonly defs: readonly TreeDef[],
    readonly cellSize = 8,
  ) {
    let maxR = 0;
    for (const t of defs) {
      const key = this.key(this.cell(t.x), this.cell(t.z));
      const list = this.cells.get(key);
      if (list) list.push(t.id);
      else this.cells.set(key, [t.id]);
      maxR = Math.max(maxR, trunkRadius(t.scale));
    }
    this.maxRadius = maxR;
  }

  private cell(v: number): number {
    return Math.floor(v / this.cellSize);
  }

  private key(cx: number, cz: number): number {
    // Cells are within ±16 of the origin for this island; pack into one number.
    return (cx + 512) * 1024 + (cz + 512);
  }

  /** Ids of trees whose centre lies within `radius` of (x, z). */
  query(x: number, z: number, radius: number, out: number[] = []): number[] {
    out.length = 0;
    const r = radius;
    const minX = this.cell(x - r);
    const maxX = this.cell(x + r);
    const minZ = this.cell(z - r);
    const maxZ = this.cell(z + r);
    const r2 = r * r;
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const list = this.cells.get(this.key(cx, cz));
        if (!list) continue;
        for (const id of list) {
          const t = this.defs[id]!;
          const dx = t.x - x;
          const dz = t.z - z;
          if (dx * dx + dz * dz <= r2) out.push(id);
        }
      }
    }
    return out;
  }
}
