import { describe, expect, it } from "vitest";
import { districts } from "@/data/districts";
import { distanceToRoad } from "@/data/world";
import { CURB_WIDTH, generateCrosswalks, generateCurbs, generateForecourts, generateLaneDashes, generateSidewalks, PARKING_PADS } from "./urban";

describe("urban furniture", () => {
  it("curbs hug the asphalt without entering it", () => {
    const curbs = generateCurbs();
    expect(curbs.length).toBeGreaterThan(10);
    for (const c of curbs) {
      expect(distanceToRoad(c.x, c.z)).toBeGreaterThanOrEqual(CURB_WIDTH / 2 - 0.02);
      expect(distanceToRoad(c.x, c.z)).toBeLessThanOrEqual(CURB_WIDTH / 2 + 0.02);
      expect(c.length).toBeGreaterThan(0);
    }
  });
  it("sidewalks stay off every road and off the plaza", () => {
    for (const s of generateSidewalks()) {
      expect(distanceToRoad(s.x, s.z)).toBeGreaterThanOrEqual(CURB_WIDTH);
      expect(Math.hypot(s.x, s.z)).toBeGreaterThan(14.5);
    }
  });
  it("crossings and dashes lie on the asphalt", () => {
    const stripes = generateCrosswalks();
    expect(stripes.length).toBe(8 * 7);
    for (const s of stripes) expect(distanceToRoad(s.x, s.z)).toBe(0);
    const dashes = generateLaneDashes();
    expect(dashes.length).toBeGreaterThan(30);
    for (const d of dashes) expect(distanceToRoad(d.x, d.z)).toBe(0);
  });
  it("parking pads do not touch roads or building footprints", () => {
    for (const p of PARKING_PADS) {
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const x = p.x + (sx * p.width) / 2;
        const z = p.z + (sz * p.depth) / 2;
        expect(distanceToRoad(x, z)).toBeGreaterThan(0.5);
        for (const d of districts) {
          const inside = Math.abs(x - d.position[0]) < d.footprint[0] / 2 && Math.abs(z - d.position[1]) < d.footprint[1] / 2;
          expect(inside, `${d.id}`).toBe(false);
        }
      }
    }
  });
  it("forecourts connect the sidewalk to each built project facade", () => {
    const fc = generateForecourts();
    expect(fc.map((f) => f.id).sort()).toEqual(["duplex", "ovi"]);
    for (const f of fc) {
      expect(f.depth).toBeGreaterThan(1);
      expect(distanceToRoad(f.x, f.z)).toBeGreaterThan(0);
    }
  });
});
