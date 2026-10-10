import { describe, expect, it } from "vitest";
import { boxFromFootprint, resolveCollisions, type Obstacle } from "../physics/collision";
import { CAR_CONFIG, createCarState, stepCar, type Constrain } from "./carPhysics";

const wall: Obstacle[] = [{ kind: "box", ...boxFromFootprint("wall", [0, 30], [40, 10]) }];
const R = 1.3;
const constrain: Constrain = (x, z) => {
  const r = resolveCollisions({ x, z, r: R }, wall, 200);
  return { x: r.x, z: r.z, blocked: r.hits.length > 0 || r.boundary };
};

describe("collisions inside the physics step", () => {
  it("never tunnels through a wall at full speed with large frame gaps", () => {
    let s = createCarState(0, 0, 0); // heading 0 → +Z, wall face at z = 25
    let maxJump = 0;
    for (let i = 0; i < 200; i++) {
      const prev = s;
      s = stepCar(s, { throttle: 1, steer: 0, brake: false }, 0.1, CAR_CONFIG, constrain);
      maxJump = Math.max(maxJump, Math.hypot(s.x - prev.x, s.z - prev.z));
      expect(s.z + R).toBeLessThanOrEqual(25 + 1e-6);
    }
    // One frame can never move the car further than 3 clamped sub-steps at max speed.
    expect(maxJump).toBeLessThanOrEqual(CAR_CONFIG.maxSpeed * CAR_CONFIG.maxDt * 3 + 1e-6);
  });

  it("bumps softly: speed reverses with low restitution instead of stopping dead or passing through", () => {
    let s = createCarState(0, 23.5, 0);
    s = { ...s, speed: CAR_CONFIG.maxSpeed };
    const next = stepCar(s, { throttle: 0, steer: 0, brake: false }, 1 / 60, CAR_CONFIG, constrain);
    expect(next.speed).toBeLessThan(0);
    expect(Math.abs(next.speed)).toBeLessThan(CAR_CONFIG.maxSpeed * 0.3);
    expect(next.z + R).toBeLessThanOrEqual(25 + 1e-6);
  });

  it("a car placed inside an obstacle is ejected to the nearest face within one step", () => {
    const s = createCarState(0, 26, 0);
    const next = stepCar(s, { throttle: 0, steer: 0, brake: false }, 1 / 60, CAR_CONFIG, constrain);
    expect(next.z + R).toBeLessThanOrEqual(25 + 1e-6);
    expect(Math.abs(next.z - s.z)).toBeLessThan(3);
  });
});
