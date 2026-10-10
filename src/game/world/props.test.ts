import { describe, expect, it } from "vitest";
import { distanceToRoad } from "@/data/world";
import { generateLamps, generateTrees } from "./props";

describe("prop placement", () => {
  it("is deterministic and keeps trees off the roads", () => {
    const a = generateTrees(120);
    const b = generateTrees(120);
    expect(a).toEqual(b);
    expect(a.length).toBe(120);
    for (const t of a) expect(distanceToRoad(t.x, t.z)).toBeGreaterThanOrEqual(3.2);
  });
  it("places lamps beside roads, not on them", () => {
    const lamps = generateLamps();
    expect(lamps.length).toBeGreaterThan(20);
    for (const l of lamps) expect(distanceToRoad(l.x, l.z)).toBeGreaterThanOrEqual(0.8);
  });
});
