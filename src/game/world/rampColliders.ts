import { rampLocal, ramps, type RampDefinition } from "@/data/ramps";

/**
 * The slope of a ramp is solid from every side but its approach: a car at
 * ground level that is not climbing this ramp is pushed out of the slope's
 * footprint (the end face below the lip and the slope body), so nobody drives
 * into a wall of terrain or pops onto it from the side. A car whose previous
 * sub-step position was already inside the corridor (the approach or the
 * slope) is climbing legitimately and passes; otherwise the lip would block
 * the launch. Pure; used by the vehicle's constraint each sub-step.
 */
export const CAR_HALF_LENGTH = 1.3;

export function constrainRampBodies(x: number, z: number, prevX: number, prevZ: number): { x: number; z: number; blocked: boolean } {
  let px = x;
  let pz = z;
  let blocked = false;
  for (const r of ramps) {
    const prev = rampLocal(r, prevX, prevZ);
    const cur = rampLocal(r, px, pz);
    const inCorridor = Math.abs(prev.lateral) <= r.width / 2 + 0.3 && prev.s >= -r.approach - 2 && prev.s <= r.length + 0.5;
    // Leaving the slope forward over the lip (V9): a car already past the lip and still moving away from it never
    // meets the end face. Without this, two consecutive sub-steps inside the band just past the lip counted the
    // second as "coming from beyond" and the end face pushed the car forward as a bump, killing its takeoff speed.
    const leaving = Math.abs(prev.lateral) <= r.width / 2 + 0.3 && prev.s > r.length && cur.s >= prev.s - 1e-9;
    if (inCorridor || leaving) continue;
    const out = pushOutOfSlope(r, px, pz);
    if (out) {
      px = out.x;
      pz = out.z;
      blocked = true;
    }
  }
  return { x: px, z: pz, blocked };
}

function pushOutOfSlope(r: RampDefinition, x: number, z: number): { x: number; z: number } | null {
  const l = rampLocal(r, x, z);
  const halfW = r.width / 2 + CAR_HALF_LENGTH;
  const s0 = 0.6; // the first half-metre of the slope is a kerb the car may roll onto from the approach side
  const s1 = r.length + CAR_HALF_LENGTH;
  if (Math.abs(l.lateral) >= halfW || l.s <= s0 || l.s >= s1) return null;
  // Smallest push: sideways out of the width, or back toward the approach, or forward past the lip.
  const candidates: [number, number, number][] = [
    [halfW - Math.abs(l.lateral), Math.sign(l.lateral || 1) * halfW, l.s],
    [l.s - s0, l.lateral, s0],
    [s1 - l.s, l.lateral, s1],
  ];
  candidates.sort((a, b) => a[0] - b[0]);
  const [, lat, s] = candidates[0]!;
  const fx = Math.sin(r.heading);
  const fz = Math.cos(r.heading);
  return { x: r.start[0] + fx * s + fz * lat, z: r.start[1] + fz * s - fx * lat };
}
