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
});
