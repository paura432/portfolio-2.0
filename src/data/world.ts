/**
 * World geometry: platform, road network and car spawn.
 * Pure data so tests, visuals and collisions share one definition.
 */
export interface RoadSegment {
  from: [x: number, z: number];
  to: [x: number, z: number];
  width: number;
}

export const PLATFORM = {
  /** Half size of the square island. */
  halfSize: 66,
  thickness: 4,
  /** Driveable half size (keeps the car away from the edge). */
  driveHalfSize: 62,
} as const;

export const ROAD_WIDTH = 7;

/** Roundabout around the Central Hub. */
export const PLAZA = {
  innerRadius: 7.5,
  outerRadius: 14.5,
} as const;

/** Straight road segments. Ring road at ±40 plus a cross that joins the plaza. */
export const ROADS: RoadSegment[] = [
  // Ring road
  { from: [-40, -40], to: [40, -40], width: ROAD_WIDTH },
  { from: [-40, 40], to: [40, 40], width: ROAD_WIDTH },
  { from: [-40, -40], to: [-40, 40], width: ROAD_WIDTH },
  { from: [40, -40], to: [40, 40], width: ROAD_WIDTH },
  // Cross from the plaza to the ring road
  { from: [-PLAZA.outerRadius + 1, 0], to: [-40, 0], width: ROAD_WIDTH },
  { from: [PLAZA.outerRadius - 1, 0], to: [40, 0], width: ROAD_WIDTH },
  { from: [0, -PLAZA.outerRadius + 1], to: [0, -40], width: ROAD_WIDTH },
  { from: [0, PLAZA.outerRadius - 1], to: [0, 40], width: ROAD_WIDTH },
  // Spurs to the future north (42 Madrid) and south (Contact) districts
  { from: [0, -40], to: [0, -47], width: ROAD_WIDTH },
  { from: [0, 40], to: [0, 47], width: ROAD_WIDTH },
];

export const CAR_SPAWN = {
  /** South road, facing the plaza. */
  position: [0, 27] as [number, number],
  /** Heading in radians. Forward vector is (sin h, 0, cos h). PI faces north (-Z). */
  heading: Math.PI,
};

/**
 * Distance from a point to the closest road surface (0 when on a road).
 * Used by tests to prove every district entrance is reachable by road.
 */
export function distanceToRoad(x: number, z: number): number {
  let best = Infinity;
  for (const r of ROADS) {
    const [ax, az] = r.from;
    const [bx, bz] = r.to;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d = Math.hypot(x - px, z - pz) - r.width / 2;
    best = Math.min(best, d);
  }
  const radial = Math.hypot(x, z);
  const plazaDist = Math.max(PLAZA.innerRadius - radial, radial - PLAZA.outerRadius);
  best = Math.min(best, plazaDist);
  return Math.max(0, best);
}
