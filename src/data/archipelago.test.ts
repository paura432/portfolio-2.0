import { describe, expect, it } from "vitest";
import { distanceToCoast, getHarbor, getIsland, harbors, insidePolygon, islands, pierBox, pointsOfInterest, polygonDistance, QUAY, QUAY_DRIVE, SEA_BOUNDS, WATER_LEVEL } from "./archipelago";
import { PLATFORM } from "./world";

describe("archipelago data", () => {
  it("has unique ids and resolvable references", () => {
    expect(new Set(islands.map((i) => i.id)).size).toBe(islands.length);
    expect(new Set(harbors.map((h) => h.id)).size).toBe(harbors.length);
    for (const h of harbors) {
      expect(getIsland(h.island).harbors).toContain(h.id);
      expect(h.mooring.vehicle).toBe("boat");
    }
    for (const p of pointsOfInterest) {
      expect(getHarbor(p.harbor).island).toBe(p.island);
      expect(getIsland(p.island)).toBeTruthy();
    }
  });
  it("water sits below the platform top and the quay extends the platform to the west", () => {
    expect(WATER_LEVEL).toBeLessThan(0);
    expect(WATER_LEVEL).toBeGreaterThan(-PLATFORM.thickness);
    expect(QUAY.x1).toBe(-PLATFORM.halfSize);
    expect(QUAY.x0).toBeLessThan(QUAY.x1);
    expect(QUAY_DRIVE.maxX).toBeLessThanOrEqual(-PLATFORM.driveHalfSize);
    expect(QUAY_DRIVE.minX).toBeGreaterThan(QUAY.x0);
  });
  it("each harbor's pier starts on land and ends in the water; its zones sit on the right side", () => {
    for (const h of harbors) {
      const island = getIsland(h.island);
      // Pier root on (or at the edge of) the island.
      expect(polygonDistance(island.coastline, h.pierRoot[0], h.pierRoot[1]), `${h.id} root`).toBeLessThanOrEqual(0.5);
      const box = pierBox(h);
      const fx = Math.sin(h.pierHeading);
      const fz = Math.cos(h.pierHeading);
      const tipX = h.pierRoot[0] + fx * h.pierLength;
      const tipZ = h.pierRoot[1] + fz * h.pierLength;
      expect(polygonDistance(island.coastline, tipX, tipZ), `${h.id} tip`).toBeGreaterThan(3);
      expect(box.maxX - box.minX).toBeGreaterThan(0);
      // Docking zone and mooring in the water, outside the pier deck, near the pier.
      expect(polygonDistance(island.coastline, h.dockingZone.x, h.dockingZone.z), `${h.id} dock`).toBeGreaterThan(2);
      expect(insidePolygon(island.coastline, h.mooring.position[0], h.mooring.position[1])).toBe(false);
      expect(Math.hypot(h.mooring.position[0] - h.dockingZone.x, h.mooring.position[1] - h.dockingZone.z)).toBeLessThan(h.dockingZone.radius);
      expect(Math.hypot(h.mooring.position[0] - tipX, h.mooring.position[1] - tipZ)).toBeLessThan(h.pierLength + 2);
      // Boarding zone on land, close to the pier root.
      expect(polygonDistance(island.coastline, h.boardingZone.x, h.boardingZone.z), `${h.id} boarding`).toBeLessThan(0);
      expect(Math.hypot(h.boardingZone.x - h.pierRoot[0], h.boardingZone.z - h.pierRoot[1])).toBeLessThan(8);
    }
  });
  it("the main harbor is on the west coast and the car can reach its boarding zone on the quay", () => {
    const h = getHarbor("pau-harbor");
    expect(h.island).toBe("main");
    expect(h.pierRoot[0]).toBeLessThan(-PLATFORM.halfSize);
    expect(h.landVehicles).toContain("car");
    expect(h.boardingZone.x).toBeGreaterThan(QUAY_DRIVE.minX);
    expect(h.boardingZone.x).toBeLessThan(QUAY_DRIVE.maxX + h.boardingZone.radius);
  });
  it("the second island lies west of the city, inside the navigation boundary, with open water between", () => {
    const lab = getIsland("creative-lab");
    expect(lab.center[0]).toBeLessThan(QUAY.x0 - 40);
    for (const [x, z] of lab.coastline) {
      expect(x).toBeGreaterThan(SEA_BOUNDS.minX + 10);
      expect(Math.abs(z)).toBeLessThan(SEA_BOUNDS.maxZ - 10);
    }
    const main = getHarbor("pau-harbor");
    const pier = getHarbor("creative-lab-pier");
    // Sample the straight line between the two moorings: never on land.
    for (let t = 0.05; t < 0.95; t += 0.05) {
      const x = main.mooring.position[0] + (pier.mooring.position[0] - main.mooring.position[0]) * t;
      const z = main.mooring.position[1] + (pier.mooring.position[1] - main.mooring.position[1]) * t;
      expect(distanceToCoast(x, z), `t=${t.toFixed(2)}`).toBeGreaterThan(1);
    }
    expect(pier.landVehicles).toEqual([]);
    expect(pointsOfInterest.some((p) => p.harbor === "creative-lab-pier")).toBe(true);
  });
  it("polygon helpers agree", () => {
    const sq = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ] as [number, number][];
    expect(insidePolygon(sq, 2, 2)).toBe(true);
    expect(insidePolygon(sq, 5, 2)).toBe(false);
    expect(polygonDistance(sq, 2, 2)).toBeCloseTo(-2, 9);
    expect(polygonDistance(sq, 6, 2)).toBeCloseTo(2, 9);
  });
});
