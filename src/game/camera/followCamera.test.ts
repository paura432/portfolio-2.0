import { describe, expect, it } from "vitest";
import { damp, desiredCamera } from "./followCamera";

describe("follow camera", () => {
  it("places the camera behind the car", () => {
    const { position, target } = desiredCamera(0, 0, 0, 0); // heading 0 → forward +Z
    expect(position.z).toBeLessThan(0);
    expect(position.y).toBeGreaterThan(0);
    expect(target.z).toBeGreaterThanOrEqual(0);
  });
  it("damping converges and is time-consistent", () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 10, 4, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = damp(b, 10, 4, 1 / 30);
    expect(Math.abs(a - b)).toBeLessThan(0.3);
    expect(a).toBeGreaterThan(9.5);
  });
});

describe("aspect-aware framing", () => {
  it("is landscape on desktop, portrait on phones, and continuous in between", async () => {
    const { configForAspect, FOLLOW_CONFIG, FOLLOW_PORTRAIT } = await import("./followCamera");
    expect(configForAspect(1.6)).toEqual(FOLLOW_CONFIG);
    expect(configForAspect(0.46)).toEqual(FOLLOW_PORTRAIT);
    const mid = configForAspect(0.925);
    expect(mid.distance).toBeGreaterThan(FOLLOW_CONFIG.distance);
    expect(mid.distance).toBeLessThan(FOLLOW_PORTRAIT.distance);
    // Small aspect changes move the camera a little, never a jump.
    const a = configForAspect(1.0);
    const b = configForAspect(0.98);
    expect(Math.abs(a.distance - b.distance)).toBeLessThan(0.3);
  });
});
