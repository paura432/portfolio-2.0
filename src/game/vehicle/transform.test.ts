import { describe, expect, it } from "vitest";
import { overRunway, stage, transformStages } from "./transform";

describe("staged wing timeline", () => {
  it("stages are monotonic, ordered (panels → wings → tail → wheels → thruster) and saturate", () => {
    let prev = transformStages(0);
    expect(prev).toEqual({ panels: 0, wings: 0, tail: 0, wheels: 0, thruster: 0 });
    for (let p = 0.05; p <= 1; p += 0.05) {
      const s = transformStages(p);
      for (const k of Object.keys(s) as (keyof typeof s)[]) expect(s[k]).toBeGreaterThanOrEqual(prev[k] - 1e-9);
      prev = s;
    }
    expect(transformStages(1)).toEqual({ panels: 1, wings: 1, tail: 1, wheels: 1, thruster: 1 });
    const mid = transformStages(0.35);
    expect(mid.panels).toBe(1);
    expect(mid.wings).toBeGreaterThan(0);
    expect(mid.wings).toBeLessThan(1);
    expect(mid.thruster).toBe(0);
    expect(stage(0.5, 0, 1)).toBeCloseTo(0.5, 6);
  });
  it("runway membership with a margin", () => {
    const r = { id: "r", minX: 0, maxX: 10, minZ: -2, maxZ: 2, y: 0, heading: 0 };
    expect(overRunway(r, 5, 0)).toBe(true);
    expect(overRunway(r, 11, 0)).toBe(false);
    expect(overRunway(r, 11, 0, 2)).toBe(true);
  });
});
