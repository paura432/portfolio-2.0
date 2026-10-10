import { describe, expect, it } from "vitest";
import { generateTrees } from "./props";
import { TREE_COUNT, TreeGrid, treeDefs, trunkRadius, visibleTreeCount } from "./trees";

describe("tree identity", () => {
  it("assigns ids equal to the index in the full deterministic list", () => {
    const defs = treeDefs();
    expect(defs.length).toBe(TREE_COUNT);
    defs.forEach((t, i) => expect(t.id).toBe(i));
    // Same data as the generator: ids are a pure annotation.
    const raw = generateTrees(TREE_COUNT);
    defs.forEach((t, i) => expect([t.x, t.z, t.kind, t.scale]).toEqual([raw[i]!.x, raw[i]!.z, raw[i]!.kind, raw[i]!.scale]));
  });
  it("keeps ids stable when the list is filtered by species or trimmed by quality", () => {
    const defs = treeDefs();
    const visible = defs.slice(0, visibleTreeCount(0.55));
    const pines = visible.filter((t) => t.kind === "pine");
    for (const p of pines) expect(defs[p.id]).toBe(p);
    expect(visibleTreeCount(1)).toBe(TREE_COUNT);
    expect(visibleTreeCount(0.8)).toBe(112);
    expect(visibleTreeCount(0.55)).toBe(77);
  });
  it("is memoised: the same array instance is returned", () => {
    expect(treeDefs()).toBe(treeDefs());
  });
});

describe("tree grid", () => {
  const defs = treeDefs();
  const grid = new TreeGrid(defs);
  it("returns exactly the brute-force neighbours for many probes", () => {
    for (let i = 0; i < 200; i++) {
      const x = ((i * 37) % 124) - 62;
      const z = ((i * 53) % 124) - 62;
      const r = 3 + (i % 5);
      const got = grid.query(x, z, r).sort((a, b) => a - b);
      const want = defs.filter((t) => Math.hypot(t.x - x, t.z - z) <= r).map((t) => t.id);
      expect(got).toEqual(want);
    }
  });
  it("reuses the output array and reports the largest trunk radius", () => {
    const out: number[] = [];
    expect(grid.query(0, 0, 1, out)).toBe(out);
    expect(grid.maxRadius).toBeGreaterThan(trunkRadius(0.7));
    expect(grid.maxRadius).toBeLessThanOrEqual(trunkRadius(1.4));
  });
});
