import { describe, expect, it } from "vitest";
import { boxFromFootprint, resolveCircleBox, resolveCircleObb, resolveCircleRound, resolveCollisions, type Obstacle } from "./collision";

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

describe("resolveCircleObb (V9)", () => {
  const bench = { id: "bench", x: 10, z: 10, rotation: Math.PI / 4, hx: 0.85, hz: 0.3 };
  it("is the axis-aligned box when the yaw is zero", () => {
    const o = { ...bench, rotation: 0 };
    expect(resolveCircleObb({ x: 10.9, z: 10, r: 0.5 }, o)!.x).toBeCloseTo(11.35, 5);
    expect(resolveCircleObb({ x: 12, z: 10, r: 0.5 }, o)).toBeNull();
  });
  it("collides where the rotated box is drawn, not where its axis-aligned bounds are", () => {
    // Along the bench's long axis (rotated 45°): the end is 0.85 away; across it only 0.3.
    const ax = Math.cos(bench.rotation);
    const az = -Math.sin(bench.rotation);
    const alongEnd = { x: bench.x + ax * 1.2, z: bench.z + az * 1.2, r: 0.5 }; // 1.2 < 0.85 + 0.5: touching the end
    const outEnd = resolveCircleObb(alongEnd, bench)!;
    expect(outEnd).not.toBeNull();
    expect(Math.hypot(outEnd.x - bench.x, outEnd.z - bench.z)).toBeCloseTo(1.35, 4);
    // The same distance across the short axis is clear (0.3 + 0.5 = 0.8 < 1.2).
    const across = { x: bench.x + -az * 1.2, z: bench.z + ax * 1.2, r: 0.5 };
    expect(resolveCircleObb(across, bench)).toBeNull();
  });
  it("ejects a circle centred inside through the nearest local face, keeping the rotation", () => {
    const out = resolveCircleObb({ x: 10.05, z: 10.05, r: 0.4 }, bench)!;
    // Distance from the centre along the short local axis must be hz + r.
    const ax = Math.cos(bench.rotation);
    const az = -Math.sin(bench.rotation);
    const lateral = Math.abs((out.x - bench.x) * -az + (out.z - bench.z) * ax);
    expect(lateral).toBeCloseTo(0.7, 4);
  });
  it("is handled by resolveCollisions like any other obstacle", () => {
    const r = resolveCollisions({ x: 10.2, z: 10, r: 0.5 }, [{ kind: "obb", ...bench }], Infinity);
    expect(r.hits).toEqual(["bench"]);
  });
});
