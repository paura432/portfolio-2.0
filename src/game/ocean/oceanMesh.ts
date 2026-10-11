import { distanceToCoast, OCEAN_EXTENT, SEA_BOUNDS } from "@/data/archipelago";

/**
 * Ocean surface grid (V6): one non-uniform grid, dense where the boat sails
 * (SEA_BOUNDS) and coarse out to the horizon, so a single draw call covers the
 * far plane with no seams and no infinite subdivided plane.
 *
 * Pure: returns typed arrays; the mesh wraps them. `shore` is the signed
 * distance to the nearest coastline (negative on land), used by the shader for
 * wave damping, shallow colour and shore foam, and by nothing else.
 */
export interface OceanGrid {
  positions: Float32Array;
  shore: Float32Array;
  /** 1 inside the dense region, fading to 0 over DENSE_FADE toward the coarse ring (waves and whitecaps fade with it). */
  dense: Float32Array;
  indices: Uint32Array;
  columns: number;
  rows: number;
}

/** Vertex spacing of the dense region per quality tier (world units). */
export const OCEAN_SPACING = { high: 2.5, medium: 3.5, low: 6 } as const;
/** Coarse rings outside the dense region: a few growing steps to the extent. */
const COARSE_STEPS = [8, 16, 32, 64];
/** Waves fade out over this distance inside the bounds so the coarse ring never shows big flat crests. */
export const DENSE_FADE = 35;

export function axisCoordinates(min: number, max: number, spacing: number, extentMin: number, extentMax: number): number[] {
  const coords: number[] = [];
  const n = Math.ceil((max - min) / spacing);
  const step = (max - min) / n;
  for (let i = 0; i <= n; i++) coords.push(min + i * step);
  // Coarse steps outward on both sides until the extent is covered.
  const lower: number[] = [];
  let x = min;
  for (const s of COARSE_STEPS) {
    x -= s;
    if (x <= extentMin) break;
    lower.unshift(x);
  }
  lower.unshift(extentMin);
  const upper: number[] = [];
  x = max;
  for (const s of COARSE_STEPS) {
    x += s;
    if (x >= extentMax) break;
    upper.push(x);
  }
  upper.push(extentMax);
  return [...lower, ...coords, ...upper];
}

export function buildOceanGrid(spacing: number, bounds = SEA_BOUNDS, extent = OCEAN_EXTENT, shoreFn: (x: number, z: number) => number = distanceToCoast): OceanGrid {
  const xs = axisCoordinates(bounds.minX, bounds.maxX, spacing, extent.centerX - extent.halfWidth, extent.centerX + extent.halfWidth);
  const zs = axisCoordinates(bounds.minZ, bounds.maxZ, spacing, extent.centerZ - extent.halfDepth, extent.centerZ + extent.halfDepth);
  const columns = xs.length;
  const rows = zs.length;
  const positions = new Float32Array(columns * rows * 3);
  const shore = new Float32Array(columns * rows);
  const dense = new Float32Array(columns * rows);
  let v = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const x = xs[i]!;
      const z = zs[j]!;
      positions[v * 3] = x;
      positions[v * 3 + 1] = 0;
      positions[v * 3 + 2] = z;
      // Clamp: far from any coast the exact value does not matter; inland it only needs to read "land".
      shore[v] = Math.max(-8, Math.min(80, shoreFn(x, z)));
      const edge = Math.min(x - bounds.minX, bounds.maxX - x, z - bounds.minZ, bounds.maxZ - z);
      dense[v] = Math.max(0, Math.min(1, edge / DENSE_FADE));
      v++;
    }
  }
  const indices = new Uint32Array((columns - 1) * (rows - 1) * 6);
  let k = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < columns - 1; i++) {
      const a = j * columns + i;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      // Counter-clockwise seen from above (+Y), so the face normal points up.
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }
  return { positions, shore, dense, indices, columns, rows };
}

export function triangleCount(g: OceanGrid): number {
  return g.indices.length / 3;
}
