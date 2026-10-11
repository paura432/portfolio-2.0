import { describe, expect, it } from "vitest";
import { beaches, beachDriveRect } from "@/data/beaches";
import { rampPoint, ramps } from "@/data/ramps";
import { generateTrees, isFreeGround } from "./props";

describe("free ground keeps the ramps and beaches clear", () => {
  it("ramp corridors and beach rectangles are never free ground", () => {
    for (const r of ramps) for (const s of [-r.approach + 1, 0, r.length / 2, r.length]) expect(isFreeGround(...rampPoint(r, s, 0))).toBe(false);
    for (const b of beaches.filter((x) => x.island === "main")) {
      const d = beachDriveRect(b);
      expect(isFreeGround((d.minX + d.maxX) / 2, (d.minZ + d.maxZ) / 2)).toBe(false);
    }
    expect(isFreeGround(-20, 58)).toBe(true);
  });
  it("no generated tree stands in a ramp corridor or on a beach", () => {
    const trees = generateTrees(140);
    for (const t of trees) {
      for (const r of ramps) {
        const fx = Math.sin(r.heading);
        const fz = Math.cos(r.heading);
        const s = (t.x - r.start[0]) * fx + (t.z - r.start[1]) * fz;
        const lat = (t.x - r.start[0]) * fz - (t.z - r.start[1]) * fx;
        expect(Math.abs(lat) <= r.width / 2 + 2 && s >= -r.approach - 2 && s <= r.length + 2, `tree at ${t.x},${t.z} in ${r.id}`).toBe(false);
      }
    }
  });
});
