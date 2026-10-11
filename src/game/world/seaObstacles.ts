import { SEA_BOUNDS, harbors, islands, pierBox, polygonDistance, type Point } from "@/data/archipelago";
import { SKYPORT } from "@/data/skyport";
import { resolveCircleBox, type Box } from "../physics/collision";
import type { Constrain } from "../vehicle/carPhysics";

/**
 * Boat colliders (V6): coastline polygons, pier decks and the navigation
 * boundary, resolved against the hull circle. Kept separate from the water
 * shader and the island meshes: the visuals follow the same polygons, the
 * physics never looks at a triangle.
 */
export const BOAT_RADIUS = 2.4;

/** Nearest point on a polygon's boundary and whether the query point is inside. */
export function nearestOnPolygon(poly: readonly Point[], x: number, z: number): { px: number; pz: number; dist: number; inside: boolean } {
  let best = Infinity;
  let px = x;
  let pz = z;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j]!;
    const [bx, bz] = poly[i]!;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const qx = ax + dx * t;
    const qz = az + dz * t;
    const d = Math.hypot(x - qx, z - qz);
    if (d < best) {
      best = d;
      px = qx;
      pz = qz;
    }
  }
  return { px, pz, dist: best, inside: polygonDistance(poly, x, z) < 0 };
}

/** Push a circle out of a polygon (land). Returns null when clear. */
export function resolveCirclePolygon(c: { x: number; z: number; r: number }, poly: readonly Point[]): { x: number; z: number } | null {
  const n = nearestOnPolygon(poly, c.x, c.z);
  if (!n.inside && n.dist >= c.r) return null;
  let nx = c.x - n.px;
  let nz = c.z - n.pz;
  const len = Math.hypot(nx, nz);
  if (len < 1e-6) {
    // Exactly on the edge: use the outward direction from the polygon centroid.
    let cx = 0;
    let cz = 0;
    for (const p of poly) {
      cx += p[0];
      cz += p[1];
    }
    cx /= poly.length;
    cz /= poly.length;
    nx = c.x - cx;
    nz = c.z - cz;
    const l2 = Math.hypot(nx, nz) || 1;
    nx /= l2;
    nz /= l2;
  } else {
    nx /= len;
    nz /= len;
    if (n.inside) {
      nx = -nx;
      nz = -nz;
    }
  }
  return { x: n.px + nx * c.r, z: n.pz + nz * c.r };
}

export interface SeaResult {
  x: number;
  z: number;
  /** Ids of the things touched (coast polygons by island id, piers by harbor id). */
  hits: string[];
  boundary: boolean;
}

export const coastPolygons: { id: string; poly: Point[] }[] = islands.map((i) => ({ id: i.id, poly: i.coastline }));
export const pierBoxes: Box[] = [
  ...harbors.map((h) => ({ id: h.id, ...pierBox(h) })),
  // The Skyport causeway (V7): deck on piles, no passage underneath.
  { id: "causeway", minX: SKYPORT.causeway.fromX, maxX: SKYPORT.causeway.toX, minZ: SKYPORT.causeway.z - SKYPORT.causeway.width / 2, maxZ: SKYPORT.causeway.z + SKYPORT.causeway.width / 2 },
];

export function resolveSeaCollisions(circle: { x: number; z: number; r: number }, polygons = coastPolygons, boxes = pierBoxes, bounds = SEA_BOUNDS): SeaResult {
  let { x, z } = circle;
  const hits: string[] = [];
  for (const p of polygons) {
    const out = resolveCirclePolygon({ x, z, r: circle.r }, p.poly);
    if (out) {
      x = out.x;
      z = out.z;
      hits.push(p.id);
    }
  }
  for (const b of boxes) {
    const out = resolveCircleBox({ x, z, r: circle.r }, b);
    if (out) {
      x = out.x;
      z = out.z;
      hits.push(b.id);
    }
  }
  const cx = Math.max(bounds.minX + circle.r, Math.min(bounds.maxX - circle.r, x));
  const cz = Math.max(bounds.minZ + circle.r, Math.min(bounds.maxZ - circle.r, z));
  const boundary = cx !== x || cz !== z;
  return { x: cx, z: cz, hits, boundary };
}

/** Constraint used by the boat each sub-step. */
export const constrainBoat: Constrain = (x, z) => {
  const r = resolveSeaCollisions({ x, z, r: BOAT_RADIUS }, coastPolygons, pierBoxes);
  return { x: r.x, z: r.z, blocked: r.hits.length > 0 || r.boundary };
};

/** Unit direction toward open water (away from the nearest coast or pier); for stuck recovery. */
export function openWaterDirection(x: number, z: number): [number, number] {
  let best = Infinity;
  let dx = 0;
  let dz = 0;
  for (const p of coastPolygons) {
    const n = nearestOnPolygon(p.poly, x, z);
    if (n.dist < best) {
      best = n.dist;
      dx = x - n.px;
      dz = z - n.pz;
      if (n.inside) {
        dx = -dx;
        dz = -dz;
      }
    }
  }
  for (const b of pierBoxes) {
    const nx = Math.max(b.minX, Math.min(x, b.maxX));
    const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const d = Math.hypot(x - nx, z - nz);
    if (d < best) {
      best = d;
      if (d > 1e-6) {
        dx = x - nx;
        dz = z - nz;
      } else {
        // Inside the deck: leave through the nearest face.
        const faces: [number, number, number][] = [
          [x - b.minX, -1, 0],
          [b.maxX - x, 1, 0],
          [z - b.minZ, 0, -1],
          [b.maxZ - z, 0, 1],
        ];
        faces.sort((a, c) => a[0] - c[0]);
        dx = faces[0]![1];
        dz = faces[0]![2];
      }
    }
  }
  const len = Math.hypot(dx, dz);
  return len > 1e-6 ? [dx / len, dz / len] : [-1, 0];
}

/** True when a hull centred here is clear of every collider (spawn and test helper). */
export function isOpenWater(x: number, z: number, r = BOAT_RADIUS): boolean {
  const res = resolveSeaCollisions({ x, z, r }, coastPolygons, pierBoxes);
  return res.hits.length === 0 && !res.boundary;
}
