import { describe, expect, it } from "vitest";
import { getHarbor, getIsland, insidePolygon, pierBox, polygonDistance, withBeaches } from "./archipelago";
import { beachOuterCorners, beaches } from "./beaches";

function simple(poly: readonly [number, number][]): boolean {
  // No two non-adjacent edges intersect.
  const n = poly.length;
  const cross = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    for (let j = i + 2; j < n; j++) {
      if ((j + 1) % n === i) continue;
      const c = poly[j]!;
      const d = poly[(j + 1) % n]!;
      const s1 = cross(a[0], a[1], b[0], b[1], c[0], c[1]);
      const s2 = cross(a[0], a[1], b[0], b[1], d[0], d[1]);
      const s3 = cross(c[0], c[1], d[0], d[1], a[0], a[1]);
      const s4 = cross(c[0], c[1], d[0], d[1], b[0], b[1]);
      if (s1 * s2 < 0 && s3 * s4 < 0) return false;
    }
  }
  return true;
}

describe("coastlines with beaches", () => {
  it("every island's coastline stays a simple polygon", () => {
    for (const id of ["main", "creative-lab", "skyport"] as const) expect(simple(getIsland(id).coastline), id).toBe(true);
  });
  it("each beach's outer corners lie on its island's coastline and the sand in front is inside the land polygon", () => {
    for (const b of beaches) {
      const coast = getIsland(b.island).coastline;
      for (const c of beachOuterCorners(b)) expect(Math.abs(polygonDistance(coast, c[0], c[1])), `${b.id} corner`).toBeLessThan(1e-6);
      const mid: [number, number] = [(b.edge.from[0] + b.edge.to[0]) / 2 + b.seaward[0] * 10, (b.edge.from[1] + b.edge.to[1]) / 2 + b.seaward[1] * 10];
      expect(insidePolygon(coast, mid[0], mid[1]), `${b.id} shallows inside the bay`).toBe(true);
    }
  });
  it("piers still start on land and end in the water (the bays never swallow them)", () => {
    for (const id of ["pau-harbor", "creative-lab-pier", "skyport-pier"] as const) {
      const h = getHarbor(id);
      const coast = getIsland(h.island).coastline;
      expect(polygonDistance(coast, h.pierRoot[0], h.pierRoot[1]), `${id} root`).toBeLessThanOrEqual(0);
      const box = pierBox(h);
      const tipX = h.pierRoot[0] + Math.sin(h.pierHeading) * h.pierLength;
      const tipZ = h.pierRoot[1] + Math.cos(h.pierHeading) * h.pierLength;
      expect(polygonDistance(coast, tipX, tipZ), `${id} tip`).toBeGreaterThan(3);
      expect(box.maxX - box.minX).toBeGreaterThan(0);
    }
  });
  it("withBeaches is idempotent on an island without beaches", () => {
    const lab = getIsland("creative-lab").coastline;
    expect(withBeaches([...lab], "main").length).toBe(lab.length);
  });
});
