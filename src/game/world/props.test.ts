import { describe, expect, it } from "vitest";
import { distanceToRoad, insidePavedArea } from "@/data/world";
import { allPlots } from "@/data/districts";
import { generateFurniture, generateLamps, generateTrees } from "./props";

describe("prop placement", () => {
  it("is deterministic and keeps trees off the roads", () => {
    const a = generateTrees(120);
    const b = generateTrees(120);
    expect(a).toEqual(b);
    expect(a.length).toBe(120);
    for (const t of a) expect(distanceToRoad(t.x, t.z)).toBeGreaterThanOrEqual(3.2);
  });
  it("mixes tree kinds and tints so no two neighbours are exact copies", () => {
    const trees = generateTrees(140);
    const kinds = new Set(trees.map((t) => t.kind));
    const tints = new Set(trees.map((t) => t.tint));
    expect(kinds.size).toBe(3);
    expect(tints.size).toBeGreaterThanOrEqual(3);
    const scales = new Set(trees.map((t) => t.scale.toFixed(2)));
    expect(scales.size).toBeGreaterThan(trees.length / 4);
  });
  it("keeps every tree and bush out of every building plot, campus labs included", () => {
    const plots = allPlots();
    const inside = (x: number, z: number) => plots.some((p) => Math.abs(x - p.position[0]) < p.footprint[0] / 2 + 1 && Math.abs(z - p.position[1]) < p.footprint[1] / 2 + 1);
    const trees = generateTrees(140);
    for (const t of trees) expect(inside(t.x, t.z), `tree at ${t.x.toFixed(1)},${t.z.toFixed(1)}`).toBe(false);
    for (const b of generateFurniture(trees).bushes) expect(inside(b.x, b.z)).toBe(false);
    for (const t of trees) expect(insidePavedArea(t.x, t.z, 0.5), `tree on the plaza at ${t.x.toFixed(1)},${t.z.toFixed(1)}`).toBe(false);
  });
  it("places lamps beside roads, not on them", () => {
    const lamps = generateLamps();
    expect(lamps.length).toBeGreaterThan(20);
    for (const l of lamps) expect(distanceToRoad(l.x, l.z)).toBeGreaterThanOrEqual(0.8);
  });
  it("keeps furniture off the asphalt", () => {
    const f = generateFurniture(generateTrees(140));
    expect(f.gardens.length).toBeGreaterThan(3);
    for (const p of [...f.bushes, ...f.benches, ...f.planters, ...f.bollards]) {
      expect(distanceToRoad(p.x, p.z)).toBeGreaterThan(0.5);
    }
  });
});
