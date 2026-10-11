import { describe, expect, it } from "vitest";
import { rampPoint, ramps } from "@/data/ramps";
import { constrainRampBodies } from "./rampColliders";

describe("ramp bodies", () => {
  const r = ramps[0]!;
  it("a car climbing from the approach passes every sub-step, up to and over the lip", () => {
    let prev = rampPoint(r, -2, 0.5);
    for (let s = -1.5; s <= r.length + 3; s += 0.5) {
      const [x, z] = rampPoint(r, s, 0.5);
      const c = constrainRampBodies(x, z, prev[0], prev[1]);
      expect(c.blocked, `s=${s}`).toBe(false);
      expect(c.x).toBe(x);
      prev = [x, z];
    }
  });
  it("a car coming at the slope from the side is pushed out of its footprint", () => {
    const [x, z] = rampPoint(r, r.length / 2, 0);
    const [px, pz] = rampPoint(r, r.length / 2, r.width); // was clearly beside the ramp
    const c = constrainRampBodies(x, z, px, pz);
    expect(c.blocked).toBe(true);
    expect(Math.hypot(c.x - x, c.z - z)).toBeGreaterThan(1);
  });
  it("a car driving into the end face from beyond the lip is stopped", () => {
    const [x, z] = rampPoint(r, r.length - 0.5, 0);
    const [px, pz] = rampPoint(r, r.length + 4, 0);
    const c = constrainRampBodies(x, z, px, pz);
    expect(c.blocked).toBe(true);
  });
  it("other ramps are untouched by a climb on one", () => {
    const other = ramps[1]!;
    const [x, z] = rampPoint(other, other.length / 2, 0);
    const [px, pz] = rampPoint(other, other.length / 2 - 0.5, 0);
    expect(constrainRampBodies(x, z, px, pz).blocked).toBe(false);
  });
  it("crossing the lip forward at any speed and any sub-step phase is never blocked (V9: the end face only faces cars coming back)", () => {
    for (const speed of [8, 12, 14, 16, 20]) {
      const step = speed / 30; // one sub-step at the physics clamp
      for (let phase = 0; phase < step; phase += step / 12) {
        let prev = rampPoint(r, r.length - 2 + phase, 0.3);
        for (let s = r.length - 2 + phase + step; s <= r.length + 4; s += step) {
          const [x, z] = rampPoint(r, s, 0.3);
          const c = constrainRampBodies(x, z, prev[0], prev[1]);
          expect(c.blocked, `speed ${speed} phase ${phase.toFixed(3)} s=${s.toFixed(2)}`).toBe(false);
          prev = [x, z];
        }
      }
    }
  });
  it("a car beyond the lip rolling back toward the slope still meets the end face", () => {
    const [x, z] = rampPoint(r, r.length + 0.8, 0);
    const [px, pz] = rampPoint(r, r.length + 1.2, 0);
    expect(constrainRampBodies(x, z, px, pz).blocked).toBe(true);
  });
});
