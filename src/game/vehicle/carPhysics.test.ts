import { describe, expect, it } from "vitest";
import { CAR_CONFIG, createCarState, stepCar } from "./carPhysics";

const run = (dt: number, seconds: number, input = { throttle: 1, steer: 0, brake: false }) => {
  let s = createCarState(0, 0, 0);
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) s = stepCar(s, input, dt);
  return s;
};

describe("stepCar", () => {
  it("accelerates forward along the heading", () => {
    const s = run(1 / 60, 1);
    expect(s.speed).toBeGreaterThan(0);
    expect(s.z).toBeGreaterThan(0); // heading 0 → +Z
    expect(Math.abs(s.x)).toBeLessThan(1e-6);
  });

  it("caps forward and reverse speed", () => {
    expect(run(1 / 60, 5).speed).toBeCloseTo(CAR_CONFIG.maxSpeed, 5);
    expect(run(1 / 60, 5, { throttle: -1, steer: 0, brake: false }).speed).toBeCloseTo(
      -CAR_CONFIG.maxReverseSpeed,
      5,
    );
  });

  it("is frame-rate independent (30 fps vs 144 fps land at the same place)", () => {
    const a = run(1 / 30, 3, { throttle: 1, steer: 0.6, brake: false });
    const b = run(1 / 144, 3, { throttle: 1, steer: 0.6, brake: false });
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.6);
    expect(Math.abs(a.heading - b.heading)).toBeLessThan(0.05);
  });

  it("clamps huge frame gaps instead of teleporting", () => {
    const s = stepCar(createCarState(0, 0, 0), { throttle: 1, steer: 0, brake: false }, 5);
    expect(Math.abs(s.z)).toBeLessThan(CAR_CONFIG.maxSpeed * CAR_CONFIG.maxDt * 3 + 1e-6);
  });

  it("brakes to a stop and never flips direction while braking", () => {
    let s = run(1 / 60, 2);
    for (let i = 0; i < 120; i++) s = stepCar(s, { throttle: 0, steer: 0, brake: true }, 1 / 60);
    expect(s.speed).toBe(0);
  });

  it("coasts to a stop without throttle", () => {
    let s = run(1 / 60, 2);
    for (let i = 0; i < 240; i++) s = stepCar(s, { throttle: 0, steer: 0, brake: false }, 1 / 60);
    expect(s.speed).toBe(0);
  });

  it("does not turn while stationary", () => {
    const s = stepCar(createCarState(0, 0, 0), { throttle: 0, steer: 1, brake: false }, 1 / 60);
    expect(s.heading).toBe(0);
  });

  it("turns right when steering right while moving forward", () => {
    const s = run(1 / 60, 1, { throttle: 1, steer: 1, brake: false });
    expect(s.heading).toBeLessThan(0); // decreasing heading = clockwise = right turn
  });
});
