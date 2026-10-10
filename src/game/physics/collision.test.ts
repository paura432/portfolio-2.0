import { describe, expect, it } from "vitest";
import { boxFromFootprint, resolveCircleBox, resolveCircleRound, resolveCollisions, type Obstacle } from "./collision";

const obstacles: Obstacle[] = [{ kind: "box", ...boxFromFootprint("b", [0, 0], [10, 10]) }];

const box = boxFromFootprint("b", [0, 0], [10, 10]);

describe("resolveCircleBox", () => {
  it("returns null when not touching", () => {
    expect(resolveCircleBox({ x: 10, z: 0, r: 1 }, box)).toBeNull();
  });
  it("pushes a circle out along the X face", () => {
    const out = resolveCircleBox({ x: 5.5, z: 0, r: 1 }, box);
    expect(out).not.toBeNull();
    expect(out!.x).toBeCloseTo(6, 5);
    expect(out!.z).toBeCloseTo(0, 5);
  });
  it("pushes a circle out diagonally at a corner", () => {
    const out = resolveCircleBox({ x: 5.3, z: 5.3, r: 1 }, box)!;
    expect(Math.hypot(out.x - 5, out.z - 5)).toBeCloseTo(1, 5);
  });
  it("ejects a circle whose centre is inside the box through the nearest face", () => {
    const out = resolveCircleBox({ x: 4, z: 1, r: 1 }, box)!;
    expect(out.x).toBeCloseTo(6, 5);
  });
});

describe("resolveCircleRound", () => {
  it("pushes a circle out radially", () => {
    const out = resolveCircleRound({ x: 5, z: 0, r: 1 }, { id: "r", x: 0, z: 0, r: 5 })!;
    expect(out.x).toBeCloseTo(6, 5);
    expect(resolveCircleRound({ x: 7, z: 0, r: 1 }, { id: "r", x: 0, z: 0, r: 5 })).toBeNull();
  });
});

describe("resolveCollisions", () => {
  it("reports hits and clamps to the platform boundary", () => {
    const r = resolveCollisions({ x: 70, z: 5.5, r: 1 }, obstacles, 60);
    expect(r.boundary).toBe(true);
    expect(r.x).toBe(59);
    expect(r.hits).toEqual([]);
  });
  it("lists the touched boxes", () => {
    const r = resolveCollisions({ x: 5.5, z: 0, r: 1 }, obstacles, 60);
    expect(r.hits).toEqual(["b"]);
  });
});
