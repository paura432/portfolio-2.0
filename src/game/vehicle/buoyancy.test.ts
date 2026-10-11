import { describe, expect, it } from "vitest";
import { heightAt } from "../ocean/waves";
import { FLOAT_VISUAL, floatPose, HULL, planingPitch, turnRoll } from "./buoyancy";

describe("point-sampled buoyancy", () => {
  it("sits flat on still water at the water height", () => {
    const p = floatPose(10, 20, 0.7, () => 0.4);
    expect(p.y).toBeCloseTo(0.4, 9);
    expect(p.pitch).toBeCloseTo(0, 9);
    expect(p.roll).toBeCloseTo(0, 9);
  });
  it("pitches nose-up on a slope rising ahead and rolls toward the lower side", () => {
    // Heading 0: forward is +Z. Surface rises with z → bow higher → positive pitch.
    const slopeZ = floatPose(0, 0, 0, (_x, z) => z * 0.1);
    expect(slopeZ.pitch).toBeCloseTo(Math.atan(0.1), 6);
    expect(slopeZ.roll).toBeCloseTo(0, 9);
    // Surface rises with x: at heading 0 the starboard side is +X → right higher → positive roll.
    const slopeX = floatPose(0, 0, 0, (x) => x * 0.1);
    expect(slopeX.roll).toBeCloseTo(Math.atan(0.1), 6);
    expect(slopeX.pitch).toBeCloseTo(0, 9);
  });
  it("is independent of the hull's position for a uniform slope and follows the heading", () => {
    const a = floatPose(0, 0, Math.PI / 2, (x) => x * 0.05);
    const b = floatPose(50, -30, Math.PI / 2, (x) => x * 0.05);
    expect(a.pitch).toBeCloseTo(b.pitch, 9);
    // Heading PI/2: forward is +X, so a slope in x pitches the hull instead of rolling it.
    expect(a.pitch).toBeCloseTo(Math.atan(0.05), 6);
    expect(Math.abs(a.roll)).toBeLessThan(1e-6);
  });
  it("rides the real waves with bounded angles", () => {
    for (let t = 0; t < 20; t += 0.5) {
      const p = floatPose(-90, 10, -Math.PI / 2, (x, z) => heightAt(x, z, t));
      expect(Math.abs(p.pitch)).toBeLessThan(0.35);
      expect(Math.abs(p.roll)).toBeLessThan(0.35);
      expect(Math.abs(p.y)).toBeLessThan(0.5);
    }
  });
  it("planing lifts the bow with speed and throttle; the hull leans into turns", () => {
    expect(planingPitch(0, 0, 16)).toBe(0);
    expect(planingPitch(16, 1, 16)).toBeCloseTo(FLOAT_VISUAL.bowLiftMax, 9);
    expect(planingPitch(8, 1, 16)).toBeGreaterThan(planingPitch(4, 1, 16));
    expect(planingPitch(16, 0, 16)).toBeLessThan(planingPitch(16, 1, 16));
    expect(turnRoll(16, 1, 16)).toBeCloseTo(FLOAT_VISUAL.turnRollMax, 9);
    expect(turnRoll(16, -1, 16)).toBeCloseTo(-FLOAT_VISUAL.turnRollMax, 9);
    expect(turnRoll(0, 1, 16)).toBe(0);
    expect(HULL.bow).toBeGreaterThan(0);
    expect(HULL.stern).toBeLessThan(0);
  });
});
