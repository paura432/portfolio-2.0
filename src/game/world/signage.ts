/**
 * Signage rules (V3):
 *  - District signs are mounted on the building itself, facing the entrance road.
 *  - Direction signposts stand beyond the sidewalk, never on it, panels ≥ 2.6 units high.
 *  - Every sign is single-sided with a solid backing; no DoubleSide text.
 * `validateSignage` is run by the unit tests.
 */
import { districts, type DistrictId } from "@/data/districts";
import { distanceToRoad } from "@/data/world";
import { CURB_WIDTH, SIDEWALK_WIDTH } from "./urban";

export interface SignMount {
  /** World position of the panel centre. */
  position: [x: number, y: number, z: number];
  /** Rotation around Y; the panel's front (+Z) faces this way. */
  rotationY: number;
  width: number;
  height: number;
}

/** Facade mounts, in world units, derived from the building designs. */
export const SIGN_MOUNTS: Partial<Record<DistrictId, SignMount>> = {
  hub: { position: [0, 3.68, 6.6 + 0.6], rotationY: 0, width: 3.6, height: 0.95 },
  duplex: { position: [-28 + 5.0, 10.2, -17 + 1.1 + 0.08], rotationY: 0, width: 3.2, height: 0.95 },
  ovi: { position: [28, 5.2, -17 + 6.1 + 0.45], rotationY: 0, width: 3.8, height: 1.0 },
  broki: { position: [28 + 2.25, 5.7, 17 - 6.25], rotationY: Math.PI, width: 4.4, height: 1.15 },
  trustos: { position: [-28, 3.6, 17 - 7.15], rotationY: Math.PI, width: 3.6, height: 0.95 },
  fortytwo: { position: [0, 6.0, -57 + 2.65], rotationY: 0, width: 3.4, height: 0.95 },
  fourgeeks: { position: [30, 8.3, -57 + 5.5 + 0.06], rotationY: 0, width: 4.6, height: 1.05 },
  contact: { position: [0, 3.1, 57 - 4.1], rotationY: Math.PI, width: 3.6, height: 0.9 },
};

export const MIN_SIGN_HEIGHT = 2.6;
/** Minimum distance from a free-standing post to the asphalt: beyond curb + sidewalk. */
export const MIN_POST_ROAD_DISTANCE = CURB_WIDTH + SIDEWALK_WIDTH;

export interface SignageIssue {
  id: string;
  issue: string;
}

/** Checks facade mounts face their entrance and stand above eye level. */
export function validateSignMounts(): SignageIssue[] {
  const issues: SignageIssue[] = [];
  for (const d of districts) {
    const mount = SIGN_MOUNTS[d.id];
    if (!mount) {
      if (d.built) issues.push({ id: d.id, issue: "built district without a sign mount" });
      continue;
    }
    const [mx, my, mz] = mount.position;
    if (my < MIN_SIGN_HEIGHT) issues.push({ id: d.id, issue: `sign too low (${my})` });
    const fx = Math.sin(mount.rotationY);
    const fz = Math.cos(mount.rotationY);
    const tx = d.entrance[0] - mx;
    const tz = d.entrance[1] - mz;
    const len = Math.hypot(tx, tz) || 1;
    const dot = (fx * tx + fz * tz) / len;
    if (dot < 0.6) issues.push({ id: d.id, issue: `sign does not face the entrance (dot ${dot.toFixed(2)})` });
    // Mounts hang on the building, so they are allowed over the plaza island edge; never over asphalt.
    if (distanceToRoad(mx, mz) <= 0) issues.push({ id: d.id, issue: "sign mount over the road" });
  }
  return issues;
}

/** Checks a free-standing post position against the placement rules. */
export function validatePost(id: string, x: number, z: number, panelY: number): SignageIssue[] {
  const issues: SignageIssue[] = [];
  const dist = distanceToRoad(x, z);
  if (dist < MIN_POST_ROAD_DISTANCE) issues.push({ id, issue: `post on the sidewalk or road (distance ${dist.toFixed(2)})` });
  if (panelY < MIN_SIGN_HEIGHT) issues.push({ id, issue: `panel too low (${panelY})` });
  for (const [did, mount] of Object.entries(SIGN_MOUNTS)) {
    if (Math.hypot(mount.position[0] - x, mount.position[2] - z) < 6) issues.push({ id, issue: `post overlaps the ${did} sign` });
  }
  return issues;
}
