/**
 * Takeoff ramps (V8). A ramp is a straight corridor: a flat approach where
 * the wings may start to deploy, then a slope that rises to a lip. The slope
 * is real terrain (the car's ground height follows it) and its sides and end
 * face are colliders, so the car can only climb it from the approach. Pure
 * data shared by the ramp meshes, the ground height field, the car colliders,
 * the transformation rules, the minimap and the tests.
 */
import { SKYPORT } from "./skyport";

export type Point = [x: number, z: number];
export type RampId = "west-ramp" | "campus-ramp" | "skyport-ramp";

export interface RampDefinition {
  id: RampId;
  name: string;
  /** Where the slope starts (ground level). */
  start: Point;
  /** Direction of travel up the ramp. Forward = (sin h, cos h) like the vehicles. */
  heading: number;
  /** Flat approach before the slope (part of the corridor: deployment may start here). */
  approach: number;
  /**
   * How far before the approach the ramp rule already treats an aligned car as "lined up" (prepare / deploy may
   * start there). The wings need 1.7 s; at the car's top speed that is 34 u, so a corridor shorter than ~40 u
   * from its entry to the lip needs a lead. Colliders, rails and the drawn deck are unaffected.
   */
  deployLead?: number;
  /** Slope length and lip height. */
  length: number;
  height: number;
  width: number;
}

/** Exponent of the slope profile: gentle at the bottom, steepest at the lip. */
export const RAMP_PROFILE_POWER = 1.6;

export const ramps: RampDefinition[] = [
  {
    id: "west-ramp",
    name: "West City Ramp",
    // South-west turf between the ring road and the coast, launching south over the sea.
    start: [-53, 32],
    heading: 0,
    approach: 22,
    length: 22,
    height: 5.5,
    width: 7,
  },
  {
    id: "campus-ramp",
    name: "Campus Ramp",
    // East strip below the 4Geeks campus, launching south over the east cross road. The slot between the east ring
    // road and the AI Workflow lab is exactly one ramp wide, so the corridor cannot shift sideways; V9 moved the
    // slope 2.5 u south and lengthened the approach to 14.5 u (the lip keeps the 1.5 u sidewalk clearance from the
    // road's asphalt); a car at rest at the corridor entry still launches, a rolling entry has ample margin.
    start: [53, -27.5],
    heading: 0,
    approach: 14.5,
    // The campus plaza's west strip north of the entry is the lining-up zone: 36.5 u from the entry to the lip is
    // 2.5 u more than the wings need at top speed, which one slow frame can eat.
    deployLead: 10,
    length: 22,
    height: 5.5,
    width: 7,
  },
  {
    id: "skyport-ramp",
    name: "Skyport Ramp",
    // The runway's east end: the whole strip is the approach.
    start: [174, (SKYPORT.runway.minZ + SKYPORT.runway.maxZ) / 2],
    heading: Math.PI / 2,
    approach: 50,
    length: 20,
    height: 5,
    width: 7,
  },
];

export function getRamp(id: RampId): RampDefinition {
  const r = ramps.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown ramp: ${id}`);
  return r;
}

/** Position relative to the ramp: `s` along the heading from the slope start, `lateral` to the right (+). */
export function rampLocal(r: RampDefinition, x: number, z: number): { s: number; lateral: number } {
  const fx = Math.sin(r.heading);
  const fz = Math.cos(r.heading);
  const dx = x - r.start[0];
  const dz = z - r.start[1];
  return { s: dx * fx + dz * fz, lateral: dx * fz - dz * fx };
}

/** Height of the slope at `s` (0 before it; the lip height at and past the end). */
export function rampHeightAt(r: RampDefinition, s: number): number {
  if (s <= 0) return 0;
  const t = Math.min(1, s / r.length);
  return r.height * Math.pow(t, RAMP_PROFILE_POWER);
}

/** Slope angle (radians, nose up) at `s`: the derivative of the profile. */
export function rampSlopeAt(r: RampDefinition, s: number): number {
  if (s <= 0 || s > r.length) return s > r.length ? rampSlopeAt(r, r.length) : 0;
  const t = s / r.length;
  const dy = (r.height * RAMP_PROFILE_POWER * Math.pow(t, RAMP_PROFILE_POWER - 1)) / r.length;
  return Math.atan(dy);
}

/** Inside the corridor (approach + slope), laterally within the width. */
export function insideRampCorridor(r: RampDefinition, x: number, z: number, margin = 0): boolean {
  const l = rampLocal(r, x, z);
  return Math.abs(l.lateral) <= r.width / 2 + margin && l.s >= -r.approach - margin && l.s <= r.length + margin;
}

/** The ramp rule's zone: the corridor plus the ramp's lining-up lead before the approach. */
export function insideRampZone(r: RampDefinition, x: number, z: number): boolean {
  const l = rampLocal(r, x, z);
  return Math.abs(l.lateral) <= r.width / 2 && l.s >= -r.approach - (r.deployLead ?? 0) && l.s <= r.length;
}

/** Ramp whose rule zone contains (x, z). */
export function rampZoneAt(x: number, z: number): RampDefinition | null {
  for (const r of ramps) if (insideRampZone(r, x, z)) return r;
  return null;
}

/** On the slope itself (the part with height). */
export function onRampSlope(r: RampDefinition, x: number, z: number): boolean {
  const l = rampLocal(r, x, z);
  return Math.abs(l.lateral) <= r.width / 2 && l.s > 0 && l.s <= r.length;
}

export function rampAt(x: number, z: number, margin = 0): RampDefinition | null {
  for (const r of ramps) if (insideRampCorridor(r, x, z, margin)) return r;
  return null;
}

/** World position of a local (s, lateral) point on the ramp. */
export function rampPoint(r: RampDefinition, s: number, lateral: number): Point {
  const fx = Math.sin(r.heading);
  const fz = Math.cos(r.heading);
  return [r.start[0] + fx * s + fz * lateral, r.start[1] + fz * s - fx * lateral];
}
