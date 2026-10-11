import { describe, expect, it } from "vitest";
import { getHarbor, harbors, islands, pierBox, SEA_BOUNDS, type Point } from "@/data/archipelago";
import { BOAT_RADIUS, constrainBoat, isOpenWater, nearestOnPolygon, openWaterDirection, resolveCirclePolygon, resolveSeaCollisions } from "./seaObstacles";

const square: Point[] = [
  [-10, -10],
  [10, -10],
  [10, 10],
  [-10, 10],
];

describe("circle vs polygon", () => {
  it("finds the nearest boundary point and inside/outside", () => {
    const n = nearestOnPolygon(square, 15, 0);
    expect(n.px).toBeCloseTo(10, 9);
    expect(n.pz).toBeCloseTo(0, 9);
    expect(n.dist).toBeCloseTo(5, 9);
    expect(n.inside).toBe(false);
    expect(nearestOnPolygon(square, 0, 0).inside).toBe(true);
  });
  it("leaves a clear circle alone, pushes a touching one out, and ejects one from inside", () => {
    expect(resolveCirclePolygon({ x: 15, z: 0, r: 2 }, square)).toBeNull();
    expect(resolveCirclePolygon({ x: 11, z: 0, r: 2 }, square)).toEqual({ x: 12, z: 0 });
    const out = resolveCirclePolygon({ x: 8, z: 1, r: 2 }, square)!;
    expect(out.x).toBeCloseTo(12, 9);
    expect(out.z).toBeCloseTo(1, 9);
  });
});

describe("sea collisions", () => {
  it("every island coastline is a closed polygon with sensible extent", () => {
    for (const i of islands) {
      expect(i.coastline.length).toBeGreaterThanOrEqual(12);
      for (const [x, z] of i.coastline) {
        expect(Number.isFinite(x) && Number.isFinite(z)).toBe(true);
      }
    }
    // The main island's coast is outside its platform everywhere.
    const main = islands.find((i) => i.id === "main")!;
    for (const [x, z] of main.coastline) expect(Math.max(Math.abs(x), Math.abs(z))).toBeGreaterThanOrEqual(66);
  });
  it("the boat cannot be inside an island or a pier, and the moorings are open water", () => {
    const r = resolveSeaCollisions({ x: 0, z: 0, r: BOAT_RADIUS });
    expect(r.hits).toContain("main");
    expect(Math.max(Math.abs(r.x), Math.abs(r.z))).toBeGreaterThan(66);
    for (const h of harbors) {
      expect(isOpenWater(h.mooring.position[0], h.mooring.position[1]), h.id).toBe(true);
      expect(isOpenWater(h.dockingZone.x, h.dockingZone.z), `${h.id} dock centre`).toBe(true);
      const box = pierBox(h);
      const inside = resolveSeaCollisions({ x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2, r: BOAT_RADIUS });
      expect(inside.hits).toContain(h.id);
    }
  });
  it("the navigation boundary is soft and flagged", () => {
    const r = resolveSeaCollisions({ x: SEA_BOUNDS.minX - 50, z: 0, r: BOAT_RADIUS });
    expect(r.boundary).toBe(true);
    expect(r.x).toBeCloseTo(SEA_BOUNDS.minX + BOAT_RADIUS, 9);
    expect(constrainBoat(SEA_BOUNDS.maxX + 5, 0).blocked).toBe(true);
  });
  it("points toward open water from any shore", () => {
    const h = getHarbor("pau-harbor");
    const [dx] = openWaterDirection(h.pierRoot[0] - 1, h.pierRoot[1] + 6);
    expect(dx).toBeLessThan(0); // away from the quay face, which is on the east
    const [dx2] = openWaterDirection(-150, 42); // just east of the Creative Lab island, clear of the pier
    expect(dx2).toBeGreaterThan(0);
    // Inside the Creative Lab pier deck: the way out is through the nearest face (sideways), never along the deck.
    const pier = getHarbor("creative-lab-pier");
    const [, dz3] = openWaterDirection(pier.pierRoot[0] + 6, pier.pierRoot[1] + 1.5);
    expect(dz3).toBeGreaterThan(0);
  });
});
