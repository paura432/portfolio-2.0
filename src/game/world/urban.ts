/**
 * Urban furniture derived from the road network: curbs, sidewalks, crossings,
 * lane markings and parking pads. Pure data, consumed by instanced meshes.
 */
import { allPlots, districts } from "@/data/districts";
import { PLAZA, ROADS, distanceToRoad, type RoadSegment } from "@/data/world";

/** A straight run of a repeated element, centred at (x, z), rotated around Y, `length` long. */
export interface Run {
  x: number;
  z: number;
  rotation: number;
  length: number;
}

export interface Placed {
  x: number;
  z: number;
  rotation: number;
}

export const SIDEWALK_WIDTH = 2.2;
export const CURB_WIDTH = 0.3;
export const CURB_HEIGHT = 0.16;
/** Distance from the road centre line to the outer edge of the sidewalk. */
export const roadsideExtent = (width: number) => width / 2 + CURB_WIDTH + SIDEWALK_WIDTH;

export interface ParkingPad {
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Rotation of the bay lines around Y. */
  rotation: number;
  bays: number;
}

/** Small parking pads beside the entrances of the two built project districts. */
export const PARKING_PADS: ParkingPad[] = [
  { x: -18.5, z: -8, width: 5, depth: 4, rotation: 0, bays: 3 },
  { x: 18.5, z: -8, width: 5, depth: 4, rotation: 0, bays: 3 },
  // PAU Harbor quay (V6): two pads flanking the harbor road, where the car parks before boarding.
  { x: -69.5, z: -6.5, width: 7, depth: 4.4, rotation: 0, bays: 4 },
  { x: -69.5, z: 6.5, width: 7, depth: 4.4, rotation: 0, bays: 4 },
];

export function insideParkingPad(x: number, z: number, margin = 0): boolean {
  return PARKING_PADS.some((p) => Math.abs(x - p.x) < p.width / 2 + margin && Math.abs(z - p.z) < p.depth / 2 + margin);
}

const PLOTS = allPlots();
export function insideAnyFootprint(x: number, z: number, margin = 0): boolean {
  return PLOTS.some((d) => Math.abs(x - d.position[0]) < d.footprint[0] / 2 + margin && Math.abs(z - d.position[1]) < d.footprint[1] / 2 + margin);
}

/** A segment end is a corner when another segment ends there too; dead ends get no wrap-around. */
function isCorner(point: [number, number], self: RoadSegment): boolean {
  return ROADS.some((o) => o !== self && (Math.hypot(o.from[0] - point[0], o.from[1] - point[1]) < 1 || Math.hypot(o.to[0] - point[0], o.to[1] - point[1]) < 1));
}

function direction(r: RoadSegment) {
  const dx = r.to[0] - r.from[0];
  const dz = r.to[1] - r.from[1];
  const len = Math.hypot(dx, dz);
  return { ux: dx / len, uz: dz / len, len, rotation: Math.atan2(dx, dz) };
}

/**
 * Samples both sides of every road at `offset` from the centre line and merges
 * consecutive valid samples into runs. `valid` decides whether a sample is kept
 * (e.g. not inside another road at an intersection, not inside the plaza).
 */
function roadsideRuns(offset: number, step: number, valid: (x: number, z: number) => boolean, overhang = 0): Run[] {
  const runs: Run[] = [];
  const occupied = new Set<string>();
  const key = (x: number, z: number) => `${Math.round(x * 2)}:${Math.round(z * 2)}`;
  for (const r of ROADS) {
    const { ux, uz, len, rotation } = direction(r);
    const nx = -uz;
    const nz = ux;
    for (const side of [-1, 1]) {
      let start: number | null = null;
      let count = 0;
      const flush = (end: number) => {
        if (start === null || count === 0) return;
        const mid = (start + end) / 2;
        runs.push({ x: r.from[0] + ux * mid + nx * offset * side, z: r.from[1] + uz * mid + nz * offset * side, rotation, length: end - start });
        start = null;
        count = 0;
      };
      const startS = isCorner(r.from, r) ? -overhang : 0;
      const endS = isCorner(r.to, r) ? len + overhang : len;
      for (let s = startS; s <= endS + 1e-6; s += step) {
        const x = r.from[0] + ux * s + nx * offset * side;
        const z = r.from[1] + uz * s + nz * offset * side;
        const k = key(x, z);
        const ok = valid(x, z) && !occupied.has(k) && !insideAnyFootprint(x, z, 0.1);
        if (ok) {
          occupied.add(k);
          if (start === null) start = s - step / 2;
          count++;
        } else {
          flush(s - step / 2);
        }
      }
      flush(endS + step / 2);
    }
  }
  return runs;
}

const outsidePlaza = (x: number, z: number, margin: number) => Math.hypot(x, z) > PLAZA.outerRadius + margin;

/** Curb runs just outside the asphalt, broken at intersections and the plaza. */
export function generateCurbs(): Run[] {
  return ROADS.length === 0
    ? []
    : roadsideRuns(ROADS[0]!.width / 2 + CURB_WIDTH / 2, 0.5, (x, z) => Math.abs(distanceToRoad(x, z) - CURB_WIDTH / 2) < 0.02 && outsidePlaza(x, z, CURB_WIDTH), ROADS[0]!.width / 2 + CURB_WIDTH);
}

/** Sidewalk slabs outside the curbs. Overhang wraps the outer corners of the ring road. */
export function generateSidewalks(): Run[] {
  const w = ROADS[0]!.width;
  return roadsideRuns(w / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2, 0.5, (x, z) => distanceToRoad(x, z) >= CURB_WIDTH && outsidePlaza(x, z, SIDEWALK_WIDTH + CURB_WIDTH), w / 2 + CURB_WIDTH + SIDEWALK_WIDTH);
}

export interface Stripe extends Placed {
  length: number;
  width: number;
}

/** Zebra crossings: at each plaza exit and before each ring/cross junction. */
export function generateCrosswalks(): Stripe[] {
  const stripes: Stripe[] = [];
  const w = ROADS[0]!.width;
  const put = (cx: number, cz: number, rotation: number) => {
    // Stripes run parallel to the road direction, spread across the road width.
    const ux = Math.sin(rotation);
    const uz = Math.cos(rotation);
    const nx = -uz;
    const nz = ux;
    const count = 7;
    const pitch = (w - 1) / (count - 1);
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * pitch;
      stripes.push({ x: cx + nx * off, z: cz + nz * off, rotation, length: 2.2, width: 0.5 });
    }
  };
  // Plaza exits (north/east/south/west), 2.2 units outside the plaza ring.
  for (const [dx, dz] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    const d = PLAZA.outerRadius + 2.4;
    put(dx * d, dz * d, Math.atan2(dx, dz));
  }
  // Cross roads meeting the ring road at (±40, 0) and (0, ±40): crossing 6 units before the junction.
  for (const [dx, dz] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    put(dx * 33.5, dz * 33.5, Math.atan2(dx, dz));
  }
  return stripes;
}

export interface Dash extends Placed {
  length: number;
}

const DASH_LENGTH = 1.6;
const DASH_GAP = 3.2;

/** Centre-line dashes, kept clear of crossings and junctions. */
export function generateLaneDashes(): Dash[] {
  const dashes: Dash[] = [];
  const crossings = generateCrosswalks();
  for (const r of ROADS) {
    const { ux, uz, len, rotation } = direction(r);
    for (let s = DASH_GAP; s < len - DASH_GAP; s += DASH_LENGTH + DASH_GAP) {
      const x = r.from[0] + ux * s;
      const z = r.from[1] + uz * s;
      if (crossings.some((c) => Math.hypot(c.x - x, c.z - z) < 3.2)) continue;
      // Skip the junction boxes where another road crosses.
      const nearJunction = ROADS.some((o) => o !== r && Math.hypot(o.from[0] - x, o.from[1] - z) < 5) || ROADS.some((o) => o !== r && Math.hypot(o.to[0] - x, o.to[1] - z) < 5);
      if (nearJunction) continue;
      dashes.push({ x, z, rotation, length: DASH_LENGTH });
    }
  }
  return dashes;
}

/** Plots in front of built project districts: a paved forecourt between sidewalk and facade. */
export interface Forecourt {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
}

export function generateForecourts(): Forecourt[] {
  return districts
    .filter((d) => d.built && d.kind !== "hub")
    .map((d) => {
      const [ex, ez] = d.entrance;
      const [bx, bz] = d.position;
      const [w, depth] = d.footprint;
      // Walk from the entrance toward the facade until the sidewalk ends.
      const vertical = Math.abs(bx - ex) < 1e-6;
      const dir = vertical ? Math.sign(bz - ez) : Math.sign(bx - ex);
      const clear = CURB_WIDTH + SIDEWALK_WIDTH - 0.01;
      const facade = vertical ? bz - (dir * depth) / 2 : bx - (dir * w) / 2;
      const maxT = Math.abs(facade - (vertical ? ez : ex));
      const probe = (t: number) => distanceToRoad(vertical ? ex : ex + dir * t, vertical ? ez + dir * t : ez);
      let t = 0;
      while (t < maxT && probe(t) < clear) t += 0.25;
      if (t >= maxT) {
        // Dead-end spur: the asphalt reaches the plot, so the forecourt starts right at the asphalt edge.
        t = 0;
        while (t < maxT && probe(t) <= 0) t += 0.25;
      }
      if (vertical) {
        const near = ez + dir * t;
        return { id: d.id, x: bx, z: (facade + near) / 2, width: w, depth: Math.abs(facade - near) };
      }
      const near = ex + dir * t;
      return { id: d.id, x: (facade + near) / 2, z: bz, width: Math.abs(facade - near), depth };
    });
}
