import { describe, expect, it } from "vitest";
import { canTransformToCar, canTransformToPlane, landingZoneDetected, overRunway, RECONFIGURE_MAX_SPEED, stage, TRANSFORM_DURATION, TRANSFORM_MAX_SPEED, transformStages, visualProgress, type Runway } from "./transform";

describe("transformation eligibility", () => {
  const ok = { playing: true, inTransition: false, onPad: true, speed: 0, colliding: false };
  it("needs the pad, a stopped car, no modal and no other transition", () => {
    expect(canTransformToPlane(ok)).toEqual({ ok: true, reason: null });
    expect(canTransformToPlane({ ...ok, speed: TRANSFORM_MAX_SPEED })).toMatchObject({ ok: true });
    expect(canTransformToPlane({ ...ok, speed: TRANSFORM_MAX_SPEED + 0.1 })).toMatchObject({ ok: false, reason: "too-fast" });
    expect(canTransformToPlane({ ...ok, speed: 15 })).toMatchObject({ ok: false, reason: "too-fast" });
    expect(canTransformToPlane({ ...ok, onPad: false })).toMatchObject({ ok: false, reason: "not-on-pad" });
    expect(canTransformToPlane({ ...ok, playing: false })).toMatchObject({ ok: false, reason: "paused" });
    expect(canTransformToPlane({ ...ok, inTransition: true })).toMatchObject({ ok: false, reason: "transition" });
    expect(canTransformToPlane({ ...ok, colliding: true })).toMatchObject({ ok: false, reason: "colliding" });
  });
  it("folds back only once rolled out and stopped", () => {
    expect(canTransformToCar({ playing: true, inTransition: false, onGround: true, speed: 0 })).toBe(true);
    expect(canTransformToCar({ playing: true, inTransition: false, onGround: true, speed: RECONFIGURE_MAX_SPEED + 0.5 })).toBe(false);
    expect(canTransformToCar({ playing: true, inTransition: false, onGround: false, speed: 0 })).toBe(false);
    expect(canTransformToCar({ playing: false, inTransition: false, onGround: true, speed: 0 })).toBe(false);
  });
  it("durations sit inside the 1.5–2.5 s budget", () => {
    expect(TRANSFORM_DURATION.toPlane).toBeGreaterThanOrEqual(1.5);
    expect(TRANSFORM_DURATION.toPlane).toBeLessThanOrEqual(2.5);
    expect(TRANSFORM_DURATION.toCar).toBeGreaterThanOrEqual(1.5);
    expect(TRANSFORM_DURATION.toCar).toBeLessThanOrEqual(2.5);
  });
});

describe("transformation timeline", () => {
  it("stages are ordered, eased and monotonic, all complete at 1", () => {
    const s0 = transformStages(0);
    expect(Object.values(s0).every((v) => v === 0)).toBe(true);
    const s1 = transformStages(1);
    expect(Object.values(s1).every((v) => v === 1)).toBe(true);
    const mid = transformStages(0.45);
    expect(mid.panels).toBe(1);
    expect(mid.wings).toBeGreaterThan(0.3);
    expect(mid.wings).toBeLessThan(1);
    expect(mid.tail).toBeGreaterThan(0);
    expect(mid.tail).toBeLessThan(0.3);
    expect(mid.thruster).toBe(0);
    let prev = transformStages(0);
    for (let p = 0.02; p <= 1; p += 0.02) {
      const cur = transformStages(p);
      for (const k of Object.keys(cur) as (keyof typeof cur)[]) expect(cur[k]).toBeGreaterThanOrEqual(prev[k] - 1e-9);
      prev = cur;
    }
    expect(stage(0.5, 0.5, 0.5 + 1e-9)).toBeGreaterThanOrEqual(0);
  });
  it("visual progress follows the phase in both directions and rests on the form", () => {
    expect(visualProgress("car", "ground", 0, 2)).toBe(0);
    expect(visualProgress("plane", "flying", 0, 2)).toBe(1);
    expect(visualProgress("car", "transforming-to-plane", 1, 2)).toBeCloseTo(0.5, 9);
    expect(visualProgress("plane", "transforming-to-car", 0.9, 1.8)).toBeCloseTo(0.5, 9);
    expect(visualProgress("plane", "transforming-to-car", 5, 1.8)).toBe(0);
  });
});

describe("landing zone", () => {
  const strip: Runway = { id: "skyport", minX: 0, maxX: 80, minZ: -5, maxZ: 5, y: 0, heading: Math.PI / 2 };
  it("knows the strip and detects an approach: low, near, not too fast", () => {
    expect(overRunway(strip, 40, 0)).toBe(true);
    expect(overRunway(strip, 40, 7)).toBe(false);
    expect(overRunway(strip, 40, 7, 3)).toBe(true);
    expect(landingZoneDetected(strip, -8, 12, 0, 18, 22)).toBe(true);
    expect(landingZoneDetected(strip, 40, 50, 0, 18, 22)).toBe(false);
    expect(landingZoneDetected(strip, 40, 10, 0, 30, 22)).toBe(false);
    expect(landingZoneDetected(strip, 40, 10, 40, 18, 22)).toBe(false);
  });
});
