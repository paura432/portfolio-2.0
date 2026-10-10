import { Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { BREAK_HEIGHT, HIDDEN_MATRIX, canopyParts, localPart, partMatrix, trunkParts, type TreePose } from "./treeRig";
import { TRUNK_HEIGHT } from "./trees";

const standing = (over: Partial<TreePose> = {}): TreePose => ({ x: 10, z: -4, scale: 1.2, rotation: 0.7, tilt: 0, dirX: 0, dirZ: 1, broken: false, slide: 0, growth: 1, ...over });
const m = new Matrix4();
const p = new Vector3();

describe("tree rig", () => {
  it("standing parts reproduce the V3 placement (trunk centred at 0.7·s, canopies at their heights)", () => {
    partMatrix("trunk", standing(), m);
    p.set(0, 0, 0).applyMatrix4(m);
    expect([p.x, p.y, p.z]).toEqual([10, 0.7 * 1.2, -4]);
    partMatrix("pine", standing(), m);
    p.set(0, 0, 0).applyMatrix4(m);
    expect(p.y).toBeCloseTo(2.6 * 1.2);
    partMatrix("tierHigh", standing(), m);
    p.set(0, 0, 0).applyMatrix4(m);
    expect(p.y).toBeCloseTo(3.2 * 1.2);
    expect(canopyParts("tiered")).toEqual(["tierLow", "tierHigh"]);
    expect(canopyParts("round")).toEqual(["round"]);
    expect(trunkParts(false)).toEqual(["trunk"]);
    expect(trunkParts(true)).toEqual(["stump", "upper"]);
  });

  it("stump + upper together span exactly the whole trunk", () => {
    const st = localPart("stump", 0);
    const up = localPart("upper", 0);
    expect(st.pos[1] - (st.scale[1] * TRUNK_HEIGHT) / 2).toBeCloseTo(0);
    expect(st.pos[1] + (st.scale[1] * TRUNK_HEIGHT) / 2).toBeCloseTo(BREAK_HEIGHT);
    expect(up.pos[1] - (up.scale[1] * TRUNK_HEIGHT) / 2).toBeCloseTo(BREAK_HEIGHT);
    expect(up.pos[1] + (up.scale[1] * TRUNK_HEIGHT) / 2).toBeCloseTo(TRUNK_HEIGHT);
  });

  it("tilting pivots at the base: the base stays put and the top moves along the fall direction, down to the ground", () => {
    const pose = standing({ tilt: Math.PI / 2, dirX: 1, dirZ: 0 });
    partMatrix("trunk", pose, m);
    // Trunk base (local y = -0.7 of the cylinder) is the pivot.
    p.set(0, -TRUNK_HEIGHT / 2, 0).applyMatrix4(m);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(-4);
    // Trunk top ends up 1.4·s along +X at ground level.
    p.set(0, TRUNK_HEIGHT / 2, 0).applyMatrix4(m);
    expect(p.x).toBeCloseTo(10 + TRUNK_HEIGHT * 1.2);
    expect(p.y).toBeCloseTo(0);
    // The canopy follows the same rotation.
    partMatrix("round", pose, m);
    p.set(0, 0, 0).applyMatrix4(m);
    expect(p.x).toBeCloseTo(10 + 2.5 * 1.2);
    expect(p.y).toBeCloseTo(0);
  });

  it("a snapped trunk keeps its stump upright and pivots the rest at the break point, sliding along the fall direction", () => {
    const pose = standing({ tilt: Math.PI / 2, dirX: 0, dirZ: -1, broken: true, slide: 0.5 });
    partMatrix("stump", pose, m);
    p.set(0, 0, 0).applyMatrix4(m);
    expect([p.x, p.y, p.z].map((v) => +v.toFixed(6))).toEqual([10, +(0.3 * 1.2).toFixed(6), -4]);
    partMatrix("upper", pose, m);
    // Bottom of the upper piece = break point + slide.
    p.set(0, -TRUNK_HEIGHT / 2, 0).applyMatrix4(m);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(BREAK_HEIGHT * 1.2);
    expect(p.z).toBeCloseTo(-4 - 0.5 * 1.2);
    // Its top lies horizontally further along -Z.
    p.set(0, TRUNK_HEIGHT / 2, 0).applyMatrix4(m);
    expect(p.y).toBeCloseTo(BREAK_HEIGHT * 1.2);
    expect(p.z).toBeLessThan(-4 - 0.5 * 1.2 - 0.5);
  });

  it("regrowth scales the whole tree uniformly from the ground; hidden is an all-zero matrix", () => {
    partMatrix("pine", standing({ growth: 0.5 }), m);
    p.set(0, 0, 0).applyMatrix4(m);
    expect(p.y).toBeCloseTo(2.6 * 1.2 * 0.5);
    expect(HIDDEN_MATRIX.elements.every((e) => e === 0 || e === 1)).toBe(true);
    expect(HIDDEN_MATRIX.elements[0]).toBe(0);
    expect(HIDDEN_MATRIX.elements[15]).toBe(1);
  });

  it("allocates nothing per call: the output matrix is reused", () => {
    const out = new Matrix4();
    expect(partMatrix("trunk", standing(), out)).toBe(out);
    expect(partMatrix("trunk", standing({ tilt: 0.3 }), out)).toBe(out);
  });
});
