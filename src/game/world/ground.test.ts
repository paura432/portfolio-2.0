import { describe, expect, it } from "vitest";
import { WATER_LEVEL } from "@/data/archipelago";
import { beaches, beachLocal } from "@/data/beaches";
import { ramps, rampPoint } from "@/data/ramps";
import { PLATFORM } from "@/data/world";
import { groundHeightAt, sampleGround, shoreDistanceAt, terrainClassAt, waterDepthAt } from "./ground";

describe("ground height field", () => {
  it("the city platform is flat at 0, roads read as road, turf as grass, the open sea as sea floor", () => {
    expect(groundHeightAt(0, 27)).toBe(0);
    expect(terrainClassAt(0, 27)).toBe("road");
    expect(terrainClassAt(-20, 58)).toBe("grass");
    expect(groundHeightAt(-150, -100)).toBeLessThan(WATER_LEVEL - 1);
    expect(terrainClassAt(-150, -100)).toBe("deep-water");
  });
  it("ramps are terrain: the height follows the slope and the sample reports the nose-up pitch", () => {
    for (const r of ramps) {
      const [x0, z0] = rampPoint(r, 0.5, 0);
      const [x1, z1] = rampPoint(r, r.length - 0.5, 0);
      expect(groundHeightAt(x0, z0)).toBeGreaterThan(0);
      expect(groundHeightAt(x1, z1)).toBeGreaterThan(groundHeightAt(x0, z0));
      const s = sampleGround(x1, z1, r.heading);
      expect(s.terrain).toBe("ramp");
      expect(s.ramp?.id).toBe(r.id);
      expect(s.slope).toBeGreaterThan(0.2);
      // Facing down the ramp the slope is negative.
      expect(sampleGround(x1, z1, r.heading + Math.PI).slope).toBeLessThan(-0.2);
    }
  });
  it("beaches descend from sand through wet sand and shallow water into deep water", () => {
    for (const b of beaches) {
      const at = (along: number) => [b.edge.from[0] + (b.edge.to[0] - b.edge.from[0]) / 2 + b.seaward[0] * along, b.edge.from[1] + (b.edge.to[1] - b.edge.from[1]) / 2 + b.seaward[1] * along] as const;
      const classes = [0.5, 4, 8, 12, 16, b.length + 2, b.length + 9].map((s) => terrainClassAt(...at(s)));
      expect(classes[0]).toBe("sand");
      expect(classes).toContain("wet-sand");
      expect(classes).toContain("shallow-water");
      expect(classes[classes.length - 1]).toBe("deep-water");
      // Depth grows seaward.
      let prev = -10;
      for (const s of [0, 3, 6, 9, 12, 15, b.length + 4]) {
        const d = waterDepthAt(...at(s));
        expect(d).toBeGreaterThanOrEqual(prev);
        prev = d;
      }
      const l = beachLocal(b, ...at(5));
      expect(l.along).toBeCloseTo(5, 6);
    }
  });
  it("the platform edge next to a beach is still land and dry", () => {
    const b = beaches[0]!;
    expect(groundHeightAt(b.edge.from[0] + 3, PLATFORM.halfSize - 1)).toBe(0);
    expect(waterDepthAt(b.edge.from[0] + 3, PLATFORM.halfSize - 1)).toBeLessThan(0);
  });

  it("the ocean's shore distance follows the sand inside a beach and the coastline elsewhere", () => {
    const b = beaches[0]!;
    const mx = (b.edge.from[0] + b.edge.to[0]) / 2;
    // Dry sand: negative (land); the waterline: 0; deeper: positive and growing.
    expect(shoreDistanceAt(mx, b.edge.from[1] + 2)).toBeLessThan(0);
    const d8 = shoreDistanceAt(mx, b.edge.from[1] + 12);
    const d16 = shoreDistanceAt(mx, b.edge.from[1] + 16);
    expect(d16).toBeGreaterThan(d8);
    expect(shoreDistanceAt(-150, -100)).toBeGreaterThan(40);
  });
});
