/**
 * Minimal collision resolution: the car is a circle on the XZ plane, buildings
 * are axis-aligned boxes and the platform is a square boundary.
 */
export interface Box {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface RoundObstacle {
  id: string;
  x: number;
  z: number;
  r: number;
}

export type Obstacle = ({ kind: "box" } & Box) | ({ kind: "round" } & RoundObstacle);

export interface CollisionResult {
  x: number;
  z: number;
  /** Ids of the boxes that were touched (empty when none). */
  hits: string[];
  /** True if the platform boundary was touched. */
  boundary: boolean;
}

export function boxFromFootprint(
  id: string,
  center: [number, number],
  footprint: [number, number],
  padding = 0,
): Box {
  const [cx, cz] = center;
  const [w, d] = footprint;
  return {
    id,
    minX: cx - w / 2 - padding,
    maxX: cx + w / 2 + padding,
    minZ: cz - d / 2 - padding,
    maxZ: cz + d / 2 + padding,
  };
}

/** Push a circle out of a box along the shortest axis. Returns null when not overlapping. */
export function resolveCircleBox(c: Circle, b: Box): { x: number; z: number } | null {
  const nearestX = Math.max(b.minX, Math.min(c.x, b.maxX));
  const nearestZ = Math.max(b.minZ, Math.min(c.z, b.maxZ));
  const dx = c.x - nearestX;
  const dz = c.z - nearestZ;
  const dist2 = dx * dx + dz * dz;
  if (dist2 >= c.r * c.r) return null;

  if (dist2 > 1e-9) {
    // Circle centre is outside the box: push along the contact normal.
    const dist = Math.sqrt(dist2);
    const push = c.r - dist;
    return { x: c.x + (dx / dist) * push, z: c.z + (dz / dist) * push };
  }

  // Centre is inside the box: exit through the nearest face.
  const toMinX = c.x - b.minX;
  const toMaxX = b.maxX - c.x;
  const toMinZ = c.z - b.minZ;
  const toMaxZ = b.maxZ - c.z;
  const m = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
  if (m === toMinX) return { x: b.minX - c.r, z: c.z };
  if (m === toMaxX) return { x: b.maxX + c.r, z: c.z };
  if (m === toMinZ) return { x: c.x, z: b.minZ - c.r };
  return { x: c.x, z: b.maxZ + c.r };
}

/** Push a circle out of a round obstacle. Returns null when not overlapping. */
export function resolveCircleRound(c: Circle, o: RoundObstacle): { x: number; z: number } | null {
  const dx = c.x - o.x;
  const dz = c.z - o.z;
  const dist = Math.hypot(dx, dz);
  const minDist = c.r + o.r;
  if (dist >= minDist) return null;
  if (dist < 1e-9) return { x: o.x + minDist, z: o.z };
  const k = minDist / dist;
  return { x: o.x + dx * k, z: o.z + dz * k };
}

export function resolveCollisions(
  circle: Circle,
  obstacles: readonly Obstacle[],
  boundaryHalfSize: number,
): CollisionResult {
  let { x, z } = circle;
  const hits: string[] = [];

  for (const o of obstacles) {
    const out =
      o.kind === "box"
        ? resolveCircleBox({ x, z, r: circle.r }, o)
        : resolveCircleRound({ x, z, r: circle.r }, o);
    if (out) {
      x = out.x;
      z = out.z;
      hits.push(o.id);
    }
  }

  const limit = boundaryHalfSize - circle.r;
  const cx = Math.max(-limit, Math.min(limit, x));
  const cz = Math.max(-limit, Math.min(limit, z));
  const boundary = cx !== x || cz !== z;
  x = cx;
  z = cz;

  return { x, z, hits, boundary };
}
