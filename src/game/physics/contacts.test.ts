import { describe, expect, it } from "vitest";
import { boxFromFootprint, MAX_PASSES, resolveCollisions, type Obstacle } from "./collision";
import { CAR_CONFIG, createCarState, stepCar, type Constrain } from "../vehicle/carPhysics";

const R = 1.3;
const corner: Obstacle[] = [
  { kind: "box", ...boxFromFootprint("wall-n", [0, -5], [40, 4]) }, // z from -7 to -3
  { kind: "box", ...boxFromFootprint("wall-e", [10, 0], [4, 40]) }, // x from 8 to 12
];
const constrainCorner: Constrain = (x, z, step) => {
  const r = resolveCollisions({ x, z, r: R }, corner, Infinity);
  return { x: r.x, z: r.z, blocked: r.hits.length > 0, speed: step?.speed };
};

describe("V9 multi-contact resolution", () => {
  it("a circle pushed into a corner ends outside both walls (sequential resolution alone leaves it inside one)", () => {
    // Deep in the corner: inside both boxes.
    const r = resolveCollisions({ x: 8.5, z: -3.5, r: R }, corner, Infinity);
    expect(r.hits.sort()).toEqual(["wall-e", "wall-n"]);
    expect(r.x + R).toBeLessThanOrEqual(8 + 1e-6);
    expect(r.z - R).toBeGreaterThanOrEqual(-3 - 1e-6);
  });
  it("touching boxes never leave a seam the circle can sink into", () => {
    const seam: Obstacle[] = [
      { kind: "box", ...boxFromFootprint("a", [-5, 0], [10, 10]) },
      { kind: "box", ...boxFromFootprint("b", [5, 0], [10, 10]) },
    ];
    for (let x = -4; x <= 4; x += 0.5) {
      const r = resolveCollisions({ x, z: 4.5, r: R }, seam, Infinity);
      expect(r.z - R, `x=${x}`).toBeGreaterThanOrEqual(5 - 1e-6);
    }
  });
  it("a rotated bench against a building: with room, the circle ends outside both; in a pocket narrower than the car, outside the building", () => {
    const box: Obstacle = { kind: "box", ...boxFromFootprint("box", [0, 0], [6, 6]) };
    // Room: the bench's short side faces the box corner 4.7 u away along the diagonal (> 2 R).
    const roomy: Obstacle = { kind: "obb", id: "bench", x: 6.3, z: 6.3, rotation: -Math.PI / 4, hx: 0.85, hz: 0.3 };
    const r1 = resolveCollisions({ x: 5.2, z: 5.2, r: R }, [box, roomy], Infinity); // overlaps the bench only (1.56 u from its centre, 3.1 u from the box corner)
    expect(r1.hits).toEqual(["bench"]);
    expect(resolveCollisions({ x: r1.x, z: r1.z, r: R }, [box, roomy], Infinity).hits).toEqual([]);
    // Pocket: the bench 1.6 u from the box corner, narrower than the car; both are hit, the building wins.
    const tight: Obstacle = { kind: "obb", id: "bench", x: 4.6, z: 2.4, rotation: Math.PI / 4, hx: 0.85, hz: 0.3 };
    const r2 = resolveCollisions({ x: 3.6, z: 1.6, r: R }, [box, tight], Infinity);
    expect(r2.hits.sort()).toEqual(["bench", "box"]);
    expect(Math.max(r2.x - 3, r2.z - 3)).toBeGreaterThanOrEqual(R - 1e-6);
  });
  it("the pass budget is bounded", () => {
    expect(MAX_PASSES).toBeLessThanOrEqual(8);
  });
});

describe("V9 driving against obstacles", () => {
  const drive = (s0: ReturnType<typeof createCarState>, input: { throttle: number; steer: number; brake: boolean }, seconds: number, fps: number) => {
    let s = s0;
    for (let i = 0; i < Math.round(seconds * fps); i++) s = stepCar(s, input, 1 / fps, CAR_CONFIG, constrainCorner);
    return s;
  };
  it("driven diagonally into the corner the car stops outside both walls and can reverse straight out", () => {
    const start = createCarState(4, 1, Math.atan2(1, -1)); // toward +X, -Z: the corner
    const inCorner = drive(start, { throttle: 1, steer: 0, brake: false }, 3, 60);
    expect(inCorner.x + R).toBeLessThanOrEqual(8 + 1e-6);
    expect(inCorner.z - R).toBeGreaterThanOrEqual(-3 - 1e-6);
    const out = drive(inCorner, { throttle: -1, steer: 0, brake: false }, 2, 60);
    expect(Math.hypot(out.x - inCorner.x, out.z - inCorner.z)).toBeGreaterThan(3);
  });
  it("a car sliding along a wall at a shallow angle keeps moving instead of stopping dead", () => {
    const start = { ...createCarState(-10, -1.0, Math.PI / 2 + 0.25), speed: 12 }; // heading mostly +X, drifting toward the north wall at z = -3
    const after = drive(start, { throttle: 1, steer: 0, brake: false }, 2, 60);
    expect(after.x).toBeGreaterThan(start.x + 8);
    expect(after.z - R).toBeGreaterThanOrEqual(-3 - 1e-6);
  });
  it("reversing into a wall bounces softly and the car keeps control", () => {
    const start = { ...createCarState(0, -1.0, 0), speed: -5 }; // heading +Z, reversing toward z = -3
    const after = drive(start, { throttle: -1, steer: 0, brake: false }, 1, 60);
    expect(after.z - R).toBeGreaterThanOrEqual(-3 - 1e-6);
    const away = drive(after, { throttle: 1, steer: 0, brake: false }, 1, 60);
    expect(away.z).toBeGreaterThan(after.z + 2);
  });
  it("the corner escape is the same at 30, 60 and 144 fps", () => {
    const start = createCarState(5.5, -0.5, Math.atan2(1, -1));
    const ends = [30, 60, 144].map((fps) => {
      const inCorner = drive(start, { throttle: 1, steer: 0, brake: false }, 2, fps);
      return drive(inCorner, { throttle: -1, steer: -1, brake: false }, 3, fps);
    });
    for (const e of ends) expect(Math.hypot(e.x - ends[1]!.x, e.z - ends[1]!.z)).toBeLessThan(1.2);
  });
  it("a car placed penetrating two obstacles is separated within one step and keeps its heading", () => {
    const s = createCarState(8.2, -3.2, 1.1);
    const next = stepCar(s, { throttle: 0, steer: 0, brake: false }, 1 / 60, CAR_CONFIG, constrainCorner);
    expect(next.x + R).toBeLessThanOrEqual(8 + 1e-6);
    expect(next.z - R).toBeGreaterThanOrEqual(-3 - 1e-6);
    expect(next.heading).toBe(1.1);
  });
});
