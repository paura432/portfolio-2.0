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

describe("drive area (V6): platform plus harbor quay", () => {
  it("lets the car reach the boarding zone on the quay but not the pier or the sea", async () => {
    const { clampToDriveArea, CAR_RADIUS } = await import("@/game/world/obstacles");
    const { getHarbor, QUAY_DRIVE } = await import("@/data/archipelago");
    const h = getHarbor("pau-harbor");
    const atZone = clampToDriveArea(h.boardingZone.x, h.boardingZone.z, CAR_RADIUS);
    expect(atZone.boundary).toBe(false);
    // Past the quay edge toward the pier: clamped back onto the quay.
    const past = clampToDriveArea(h.pierRoot[0] - 3, 0, CAR_RADIUS);
    expect(past.boundary).toBe(true);
    expect(past.x).toBeCloseTo(QUAY_DRIVE.minX + CAR_RADIUS, 9);
    // Off the platform edge away from the quay: still the square boundary.
    const side = clampToDriveArea(-64, 30, CAR_RADIUS);
    expect(side.boundary).toBe(true);
    expect(side.x).toBeCloseTo(-62 + CAR_RADIUS, 9);
    // Inside the platform: untouched.
    expect(clampToDriveArea(10, -20, CAR_RADIUS)).toEqual({ x: 10, z: -20, boundary: false });
    // The seam between platform and quay is continuous: a point on the platform edge inside the quay band is free.
    expect(clampToDriveArea(-62.5, 2, CAR_RADIUS).boundary).toBe(false);
  });
  it("drives from the platform onto the quay without getting caught on the seam", async () => {
    const { constrainCar } = await import("@/game/world/obstacles");
    const { stepCar, createCarState } = await import("./carPhysics");
    let s = createCarState(-46, 0, -Math.PI / 2);
    for (let t = 0; t < 6; t += 1 / 60) s = stepCar(s, { throttle: 1, steer: 0, brake: false }, 1 / 60, undefined, constrainCar);
    expect(s.x).toBeLessThan(-66);
    expect(s.x).toBeGreaterThan(-74);
  });
  it("the harbor road reaches the quay and the cabin collides", async () => {
    const { distanceToRoad } = await import("@/data/world");
    const { obstacles, HARBOR_CABIN, CAR_RADIUS } = await import("@/game/world/obstacles");
    const { resolveCollisions } = await import("@/game/physics/collision");
    const { getHarbor } = await import("@/data/archipelago");
    const h = getHarbor("pau-harbor");
    expect(distanceToRoad(h.boardingZone.x, h.boardingZone.z)).toBe(0);
    expect(distanceToRoad(-55, 0)).toBe(0);
    const r = resolveCollisions({ x: HARBOR_CABIN.position[0], z: HARBOR_CABIN.position[1], r: CAR_RADIUS }, obstacles, Infinity);
    expect(r.hits).toContain("harbor-cabin");
  });
});
