import { describe, expect, it } from "vitest";
import { surfaceAt } from "../world/surface";
import { DRIVE_FX, driveFx } from "./driving";

describe("surface classification", () => {
  it("knows asphalt, pavement and turf", () => {
    expect(surfaceAt(0, 27)).toBe("asphalt"); // spawn, on the south road
    expect(surfaceAt(4.6, 27)).toBe("pavement"); // curb + sidewalk band
    expect(surfaceAt(-7.3, 29)).toBe("turf"); // boulevard tree row
    expect(surfaceAt(0, 0)).toBe("pavement"); // plaza island
    expect(surfaceAt(11, 0)).toBe("asphalt"); // roundabout ring
    expect(surfaceAt(40, -49)).toBe("pavement"); // 4Geeks research plaza
  });
});

describe("driving feedback", () => {
  const base = { surface: "turf" as const, speed: 12, steer: 0, brake: false, accel: 0 };
  it("produces no dust while the car is stopped or crawling", () => {
    expect(driveFx({ ...base, speed: 0 }).dustRate).toBe(0);
    expect(driveFx({ ...base, speed: DRIVE_FX.minDustSpeed - 0.1 }).dustRate).toBe(0);
  });
  it("kicks up dust on turf in proportion to speed, never on asphalt or pavement", () => {
    const slow = driveFx({ ...base, speed: 6 }).dustRate;
    const fast = driveFx({ ...base, speed: 18 }).dustRate;
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow);
    expect(driveFx({ ...base, speed: -8 }).dustRate).toBeGreaterThan(0); // reversing counts
    expect(driveFx({ ...base, surface: "asphalt" }).dustRate).toBe(0);
    expect(driveFx({ ...base, surface: "pavement" }).dustRate).toBe(0);
  });
  it("skids on asphalt under hard braking or a fast turn, not on turf, not when slow", () => {
    expect(driveFx({ ...base, surface: "asphalt", speed: 15, brake: true, accel: -30 }).skid).toBe(true);
    expect(driveFx({ ...base, surface: "asphalt", speed: 15, steer: 1 }).skid).toBe(true);
    expect(driveFx({ ...base, surface: "asphalt", speed: 15, steer: 0.3 }).skid).toBe(false);
    expect(driveFx({ ...base, surface: "asphalt", speed: 4, brake: true, accel: -30 }).skid).toBe(false);
    expect(driveFx({ ...base, surface: "turf", speed: 15, brake: true, accel: -30 }).skid).toBe(false);
  });
  it("hard brake needs the brake pressed and a real deceleration", () => {
    expect(driveFx({ ...base, surface: "asphalt", brake: true, accel: -30 }).hardBrake).toBe(true);
    expect(driveFx({ ...base, surface: "asphalt", brake: false, accel: -30 }).hardBrake).toBe(false);
    expect(driveFx({ ...base, surface: "asphalt", brake: true, accel: -5 }).hardBrake).toBe(false);
  });
});
