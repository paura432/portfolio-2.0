import { describe, expect, it } from "vitest";
import { beaches, beachDriveRect } from "./beaches";
import { allPlots, districts } from "./districts";
import { insideRampCorridor, onRampSlope, rampAt, rampHeightAt, rampLocal, rampPoint, ramps, rampSlopeAt } from "./ramps";
import { distanceToRoad } from "./world";

describe("ramps", () => {
  it("the slope rises monotonically from 0 to the lip height and the lip angle is a real launch angle", () => {
    for (const r of ramps) {
      expect(rampHeightAt(r, -1)).toBe(0);
      expect(rampHeightAt(r, 0)).toBe(0);
      let prev = 0;
      for (let s = 0.25; s <= r.length; s += 0.25) {
        const y = rampHeightAt(r, s);
        expect(y).toBeGreaterThanOrEqual(prev);
        prev = y;
      }
      expect(rampHeightAt(r, r.length)).toBeCloseTo(r.height, 6);
      expect(rampHeightAt(r, r.length + 5)).toBeCloseTo(r.height, 6);
      const lip = rampSlopeAt(r, r.length);
      expect(lip).toBeGreaterThan(0.25);
      expect(lip).toBeLessThan(0.5);
      expect(rampSlopeAt(r, 0.5)).toBeLessThan(lip);
    }
  });
  it("local coordinates and corridor membership", () => {
    const r = ramps[0]!;
    const [x, z] = rampPoint(r, 5, 1);
    const l = rampLocal(r, x, z);
    expect(l.s).toBeCloseTo(5, 6);
    expect(l.lateral).toBeCloseTo(1, 6);
    expect(onRampSlope(r, x, z)).toBe(true);
    expect(insideRampCorridor(r, ...rampPoint(r, -r.approach + 1, 0))).toBe(true);
    expect(insideRampCorridor(r, ...rampPoint(r, -r.approach - 1, 0))).toBe(false);
    expect(onRampSlope(r, ...rampPoint(r, -1, 0))).toBe(false);
    expect(onRampSlope(r, ...rampPoint(r, 5, r.width))).toBe(false);
    expect(rampAt(x, z)?.id).toBe(r.id);
  });
  it("no ramp corridor crosses a road, a building or a beach", () => {
    const boxes = [
      ...districts.filter((d) => d.built).map((d) => ({ id: d.id, x: d.position[0], z: d.position[1], w: d.footprint[0], d: d.footprint[1] })),
      ...allPlots().map((p) => ({ id: p.id, x: p.position[0], z: p.position[1], w: p.footprint[0], d: p.footprint[1] })),
    ];
    for (const r of ramps) {
      for (let s = -r.approach; s <= r.length; s += 1) {
        for (const lat of [-r.width / 2, 0, r.width / 2]) {
          const [x, z] = rampPoint(r, s, lat);
          if (r.id !== "skyport-ramp") expect(distanceToRoad(x, z), `${r.id} s=${s}`).toBeGreaterThan(1.5);
          for (const b of boxes) {
            const inside = Math.abs(x - b.x) < b.w / 2 + 1 && Math.abs(z - b.z) < b.d / 2 + 1;
            expect(inside, `${r.id} crosses ${b.id}`).toBe(false);
          }
          for (const b of beaches) {
            const br = beachDriveRect(b);
            expect(x > br.minX && x < br.maxX && z > br.minZ && z < br.maxZ, `${r.id} crosses ${b.id}`).toBe(false);
          }
        }
      }
    }
  });
});
