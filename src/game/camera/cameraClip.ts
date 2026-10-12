import type { Obstacle } from "../physics/collision";

/**
 * Camera occlusion (V9, CAM-01). The follow camera's wanted position may lie
 * inside a building when the car stands beside a facade; this module finds
 * how far along the segment from the car to the wanted position the camera
 * may go before it enters an occluder, so the camera is pulled in along its
 * own line of sight instead of clipping through walls. Occluders are the
 * world's static colliders treated as vertical prisms (buildings, the hangar
 * walls, the tower, the cabin); the low ramp rails are ignored. Pure.
 */
export interface Point2 {
  x: number;
  z: number;
}

/** Buildings and the like: everything static except the ramp rails (0.95 u high, never in the way of a camera). */
export function cameraOccluders(obstacles: readonly Obstacle[]): Obstacle[] {
  return obstacles.filter((o) => !o.id.includes("-rail-"));
}

/** First entry parameter t ∈ [0, 1] of the segment a→b into an axis-aligned box, or null. */
function segmentBox(a: Point2, b: Point2, minX: number, maxX: number, minZ: number, maxZ: number): number | null {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let t0 = 0;
  let t1 = 1;
  for (const [p, d, lo, hi] of [
    [a.x, dx, minX, maxX],
    [a.z, dz, minZ, maxZ],
  ] as const) {
    if (Math.abs(d) < 1e-12) {
      if (p < lo || p > hi) return null;
      continue;
    }
    let near = (lo - p) / d;
    let far = (hi - p) / d;
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near);
    t1 = Math.min(t1, far);
    if (t0 > t1) return null;
  }
  return t0;
}

/** First entry parameter of the segment a→b into a circle, or null (0 when a starts inside). */
function segmentCircle(a: Point2, b: Point2, cx: number, cz: number, r: number): number | null {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const fx = a.x - cx;
  const fz = a.z - cz;
  const A = dx * dx + dz * dz;
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;
  if (C <= 0) return 0;
  if (A < 1e-12) return null;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  return t >= 0 && t <= 1 ? t : null;
}

/**
 * Fraction of the car→camera segment the camera may use before entering an
 * occluder, minus `margin` units of clearance (never below `minFraction`).
 * 1 when nothing is in the way.
 */
export function clipFraction(target: Point2, wanted: Point2, occluders: readonly Obstacle[], margin = 0.8, minFraction = 0.08): number {
  const len = Math.hypot(wanted.x - target.x, wanted.z - target.z);
  if (len < 1e-6) return 1;
  let t = 1;
  for (const o of occluders) {
    let hit: number | null = null;
    if (o.kind === "box") hit = segmentBox(target, wanted, o.minX, o.maxX, o.minZ, o.maxZ);
    else if (o.kind === "round") hit = segmentCircle(target, wanted, o.x, o.z, o.r);
    else {
      // Oriented box: into its frame.
      const cos = Math.cos(o.rotation);
      const sin = Math.sin(o.rotation);
      const toLocal = (p: Point2): Point2 => ({ x: (p.x - o.x) * cos - (p.z - o.z) * sin, z: (p.x - o.x) * sin + (p.z - o.z) * cos });
      hit = segmentBox(toLocal(target), toLocal(wanted), -o.hx, o.hx, -o.hz, o.hz);
    }
    if (hit !== null && hit < t) t = hit;
  }
  if (t >= 1) return 1;
  return Math.max(minFraction, t - margin / len);
}
