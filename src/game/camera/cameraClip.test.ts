import { describe, expect, it } from "vitest";
import { boxFromFootprint, type Obstacle } from "../physics/collision";
import { obstacles } from "../world/obstacles";
import { cameraOccluders, clipFraction } from "./cameraClip";

const wall: Obstacle[] = [{ kind: "box", ...boxFromFootprint("wall", [0, 20], [10, 4]) }]; // z 18..22

describe("camera clip (CAM-01)", () => {
  it("is 1 with nothing between the car and the camera", () => {
    expect(clipFraction({ x: 0, z: 0 }, { x: 0, z: -10 }, wall)).toBe(1);
  });
  it("pulls the camera in front of a wall on its line of sight, with clearance", () => {
    // Car at z 10 looking at +Z, camera wanted at z 25 (inside / beyond the wall starting at z 18).
    const f = clipFraction({ x: 0, z: 10 }, { x: 0, z: 25 }, wall, 0.8);
    const z = 10 + f * 15;
    expect(z).toBeCloseTo(18 - 0.8, 5);
  });
  it("never collapses below the minimum fraction", () => {
    expect(clipFraction({ x: 0, z: 17.5 }, { x: 0, z: 30 }, wall)).toBe(0.08);
  });
  it("handles the round hub and oriented boxes", () => {
    const hub: Obstacle = { kind: "round", id: "hub", x: 0, z: 0, r: 6 };
    const f = clipFraction({ x: 0, z: 10 }, { x: 0, z: -2 }, [hub], 0);
    expect(10 - f * 12).toBeCloseTo(6, 5);
    const obb: Obstacle = { kind: "obb", id: "b", x: 0, z: 20, rotation: Math.PI / 4, hx: 2, hz: 2 };
    expect(clipFraction({ x: 0, z: 10 }, { x: 0, z: 30 }, [obb], 0)).toBeLessThan(0.45);
  });
  it("excludes the ramp rails from the occluders", () => {
    const occ = cameraOccluders(obstacles);
    expect(occ.some((o) => o.id.includes("-rail-"))).toBe(false);
    expect(occ.some((o) => o.id === "duplex")).toBe(true);
  });
  it("at the Duplex forecourt corner (the CAM-01 capture) the camera stays outside the Duplex block", () => {
    // Car at (-18.5, -17) facing +X: the V8 camera sat 11 u behind it at x ≈ -29.5, inside Duplex (x -36..-20).
    const car = { x: -18.5, z: -17 };
    const wanted = { x: -29.5, z: -17 };
    const f = clipFraction(car, wanted, cameraOccluders(obstacles));
    const x = car.x + f * (wanted.x - car.x);
    expect(x).toBeGreaterThan(-20); // the padded facade is at x = -20
    expect(f).toBeLessThan(0.3);
  });
});
