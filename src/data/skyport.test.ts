import { describe, expect, it } from "vitest";
import { insidePolygon } from "./archipelago";
import { insideSkyportPad, runwayLights, SKYPORT, SKYPORT_DRIVE_RECTS, SKYPORT_OBSTACLES, SKYPORT_ROADS, skyportCoastline } from "./skyport";

describe("skyport layout", () => {
  it("pad sits on the runway threshold and the runway lies inside the slab", () => {
    const r = SKYPORT.runway;
    expect(SKYPORT.pad.x).toBeGreaterThan(r.minX);
    expect(SKYPORT.pad.z).toBeGreaterThan(r.minZ);
    expect(SKYPORT.pad.z).toBeLessThan(r.maxZ);
    expect(r.minX).toBeGreaterThan(SKYPORT.slab.minX);
    expect(r.maxX).toBeLessThan(SKYPORT.slab.maxX);
    expect(r.maxX - r.minX).toBeGreaterThanOrEqual(70);
    expect(SKYPORT.spawn.x).toBe(SKYPORT.pad.x);
  });
  it("buildings stay clear of the runway, the pad and the roads", () => {
    const r = SKYPORT.runway;
    for (const b of SKYPORT_OBSTACLES) {
      const [cx, cz] = b.position;
      const [w, d] = b.footprint;
      const minZ = cz - d / 2;
      expect(minZ, b.id).toBeGreaterThan(r.maxZ + 2);
      expect(Math.hypot(cx - SKYPORT.pad.x, cz - SKYPORT.pad.z), b.id).toBeGreaterThan(SKYPORT.pad.radius + Math.max(w, d) / 2 + 2);
      for (const road of SKYPORT_ROADS) {
        // Roads are axis-aligned; the building box must not touch the asphalt band (half width 3.5 + 1 u).
        const horizontal = road.from[1] === road.to[1];
        if (horizontal) {
          const z = road.from[1];
          const overlapX = cx + w / 2 > Math.min(road.from[0], road.to[0]) && cx - w / 2 < Math.max(road.from[0], road.to[0]);
          if (overlapX) expect(Math.abs(cz - z) - d / 2, `${b.id} vs road`).toBeGreaterThan(4.5);
        }
      }
    }
  });
  it("coastline is a closed loop that contains the slab and the car's rectangles", () => {
    const coast = skyportCoastline();
    expect(coast.length).toBeGreaterThanOrEqual(16);
    for (const rect of SKYPORT_DRIVE_RECTS.slice(1)) {
      for (const [x, z] of [
        [rect.minX, rect.minZ],
        [rect.maxX, rect.minZ],
        [rect.maxX, rect.maxZ],
        [rect.minX, rect.maxZ],
      ] as const) {
        expect(insidePolygon(coast, x, z), `${x},${z}`).toBe(true);
      }
    }
    expect(insidePolygon(coast, SKYPORT.slab.maxX + 30, 0)).toBe(false);
    expect(insidePolygon(coast, SKYPORT.causeway.fromX + 5, 0)).toBe(false);
  });
  it("runway lights line both edges and the thresholds, approach lights continue over the sea", () => {
    const lights = runwayLights();
    const edge = lights.filter((l) => l.kind === "edge");
    const threshold = lights.filter((l) => l.kind === "threshold");
    const approach = lights.filter((l) => l.kind === "approach");
    expect(edge.length).toBeGreaterThanOrEqual(16);
    expect(edge.every((l) => l.z < SKYPORT.runway.minZ || l.z > SKYPORT.runway.maxZ)).toBe(true);
    expect(threshold.length).toBeGreaterThanOrEqual(8);
    expect(approach.every((l) => l.x > SKYPORT.slab.maxX)).toBe(true);
    expect(insideSkyportPad(SKYPORT.pad.x + 2, SKYPORT.pad.z)).toBe(true);
    expect(insideSkyportPad(SKYPORT.pad.x + 9, SKYPORT.pad.z)).toBe(false);
  });
});
