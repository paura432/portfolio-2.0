import { describe, expect, it } from "vitest";
import { CAR_CONFIG } from "./carPhysics";
import { isBraking, targetPitch, targetRoll, VISUAL_CONFIG } from "./carVisual";

describe("car visual animation", () => {
  it("rolls out of the turn and never beyond the limit", () => {
    const left = targetRoll({ x: 0, z: 0, heading: 0, speed: CAR_CONFIG.maxSpeed, steerAngle: CAR_CONFIG.maxSteerAngle });
    const right = targetRoll({ x: 0, z: 0, heading: 0, speed: CAR_CONFIG.maxSpeed, steerAngle: -CAR_CONFIG.maxSteerAngle });
    expect(left).toBeLessThan(0);
    expect(right).toBeGreaterThan(0);
    expect(Math.abs(left)).toBeLessThanOrEqual(VISUAL_CONFIG.maxRoll);
    expect(targetRoll({ x: 0, z: 0, heading: 0, speed: 0, steerAngle: 0.5 })).toBe(-0);
  });
  it("pitches nose-down under braking and nose-up under acceleration", () => {
    expect(targetPitch(-CAR_CONFIG.brakeDeceleration)).toBeGreaterThan(0);
    expect(targetPitch(CAR_CONFIG.acceleration)).toBeLessThan(0);
    expect(Math.abs(targetPitch(-1000))).toBeLessThanOrEqual(VISUAL_CONFIG.maxPitch);
  });
  it("brake lights follow brake input, reverse and deceleration", () => {
    const s = { x: 0, z: 0, heading: 0, speed: 10, steerAngle: 0 };
    expect(isBraking(s, 0, true)).toBe(true);
    expect(isBraking({ ...s, speed: -2 }, 0, false)).toBe(true);
    expect(isBraking(s, -10, false)).toBe(true);
    expect(isBraking(s, 5, false)).toBe(false);
    expect(isBraking({ ...s, speed: 0 }, -10, false)).toBe(false);
  });
});
