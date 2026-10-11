import { describe, expect, it } from "vitest";
import { WATER_LEVEL } from "./archipelago";
import { beachAt, beachDriveRect, beachHeightAlong, beachLocal, beachOuterCorners, beaches, insideBeach, SEA_FLOOR_Y } from "./beaches";
import { PLATFORM } from "./world";

describe("beaches", () => {
  it("every beach slopes from its edge height under the water to the sea floor, monotonically", () => {
    for (const b of beaches) {
      expect(beachHeightAlong(b, -1)).toBe(b.landHeight);
      expect(beachHeightAlong(b, 0)).toBe(b.landHeight);
      let prev = b.landHeight;
      for (let s = 0.5; s <= b.length + 10; s += 0.5) {
        const y = beachHeightAlong(b, s);
        expect(y).toBeLessThanOrEqual(prev + 1e-9);
        prev = y;
      }
      expect(beachHeightAlong(b, b.length)).toBeCloseTo(b.landHeight - b.drop, 6);
      expect(beachHeightAlong(b, b.length + 20)).toBe(SEA_FLOOR_Y);
      // The waterline falls inside the slope: there is wet sand and shallow water to drive through.
      expect(b.landHeight - b.drop).toBeLessThan(WATER_LEVEL - 0.5);
    }
  });
  it("local coordinates: along grows seaward, across runs along the edge", () => {
    const b = beaches[0]!; // south beach, seaward +Z
    const l = beachLocal(b, b.edge.from[0] + 5, PLATFORM.halfSize + 3);
    expect(l.along).toBeCloseTo(3, 6);
    expect(l.across).toBeCloseTo(5, 6);
    expect(l.width).toBeCloseTo(28, 6);
    expect(insideBeach(b, b.edge.from[0] + 5, PLATFORM.halfSize + 3)).toBe(true);
    expect(insideBeach(b, b.edge.from[0] - 1, PLATFORM.halfSize + 3)).toBe(false);
    expect(beachAt(b.edge.from[0] + 5, PLATFORM.halfSize + 3)?.id).toBe("south-beach");
    expect(beachAt(0, 0)).toBe(null);
  });
  it("outer corners and drive rectangles reach past the slope and a little inland", () => {
    for (const b of beaches) {
      const [c0, c1] = beachOuterCorners(b);
      const r = beachDriveRect(b);
      expect(Math.hypot(c1[0] - c0[0], c1[1] - c0[1])).toBeCloseTo(beachLocal(b, b.edge.to[0], b.edge.to[1]).across, 6);
      expect(r.maxX - r.minX).toBeGreaterThan(0);
      expect(r.maxZ - r.minZ).toBeGreaterThan(0);
      const inlandX = b.edge.from[0] - b.seaward[0] * 2;
      const inlandZ = b.edge.from[1] - b.seaward[1] * 2;
      expect(inlandX >= r.minX && inlandX <= r.maxX && inlandZ >= r.minZ && inlandZ <= r.maxZ).toBe(true);
    }
  });
  it("beaches never overlap each other", () => {
    for (const a of beaches)
      for (const b of beaches) {
        if (a === b) continue;
        const ra = beachDriveRect(a);
        const rb = beachDriveRect(b);
        const overlap = ra.minX < rb.maxX && rb.minX < ra.maxX && ra.minZ < rb.maxZ && rb.minZ < ra.maxZ;
        expect(overlap, `${a.id} vs ${b.id}`).toBe(false);
      }
  });
});
