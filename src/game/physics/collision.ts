/**
 * Collision resolution on the XZ plane (V9). The car is a circle; the world
 * offers axis-aligned boxes (buildings, decks, rails), round obstacles (the
 * hub pavilion, trunks, posts) and oriented boxes (rotated furniture: benches,
 * planters). A compound collider is simply several obstacles sharing one id
 * (the hangar's three walls). Every resolver pushes the circle out along the
 * shortest axis and reports what was touched; nothing here looks at a
 * triangle.
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

/** Oriented box: centre, yaw (rotation around Y, same convention as the props) and half extents in its local frame. */
export interface OrientedBox {
  id: string;
  x: number;
  z: number;
  rotation: number;
  /** Half extent along the local X axis (width / 2). */
  hx: number;
  /** Half extent along the local Z axis (depth / 2). */
  hz: number;
}

export type Obstacle = ({ kind: "box" } & Box) | ({ kind: "round" } & RoundObstacle) | ({ kind: "obb" } & OrientedBox);

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

/**
 * Push a circle out of an oriented box: the circle is taken into the box's
 * local frame (where the box is axis-aligned), resolved there, and the result
 * is rotated back. Exact for any yaw, so a rotated bench collides where it is drawn.
 */
export function resolveCircleObb(c: Circle, o: OrientedBox): { x: number; z: number } | null {
  const cos = Math.cos(o.rotation);
  const sin = Math.sin(o.rotation);
  const dx = c.x - o.x;
  const dz = c.z - o.z;
  // World → local: inverse of the Y rotation (local X = (cos, -sin) in world, local Z = (sin, cos)).
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  const out = resolveCircleBox({ x: lx, z: lz, r: c.r }, { id: o.id, minX: -o.hx, maxX: o.hx, minZ: -o.hz, maxZ: o.hz });
  if (!out) return null;
  return { x: o.x + out.x * cos + out.z * sin, z: o.z - out.x * sin + out.z * cos };
}

/** The resolver for any obstacle kind. */
export function resolveCircleObstacle(c: Circle, o: Obstacle): { x: number; z: number } | null {
  return o.kind === "box" ? resolveCircleBox(c, o) : o.kind === "round" ? resolveCircleRound(c, o) : resolveCircleObb(c, o);
}

export function resolveCollisions(
  circle: Circle,
  obstacles: readonly Obstacle[],
  boundaryHalfSize: number,
): CollisionResult {
  let { x, z } = circle;
  const hits: string[] = [];

  for (const o of obstacles) {
    const out = resolveCircleObstacle({ x, z, r: circle.r }, o);
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
