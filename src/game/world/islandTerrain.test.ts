import { describe, expect, it } from "vitest";
import { CREATIVE_LAB_CENTER, getIsland, insidePolygon, WATER_LEVEL } from "@/data/archipelago";
import { buildCoastSkirt, buildIslandTerrain, coastRadiusAt, coastRocks, colorForHeight, islandHeightAt, islandProfileHeight, islandRings } from "./islandTerrain";

describe("island terrain", () => {
  const lab = getIsland("creative-lab");
  it("profile descends from a plateau at the centre to the sea floor outside the waterline", () => {
    const h = lab.landHeight;
    expect(islandProfileHeight(0, h)).toBeGreaterThan(h + 1.5);
    expect(islandProfileHeight(0.8, h)).toBeGreaterThanOrEqual(h);
    expect(islandProfileHeight(1.0, h)).toBeLessThan(WATER_LEVEL);
    expect(islandProfileHeight(1.3, h)).toBeLessThan(WATER_LEVEL - 2);
    // Monotonic from the centre outward.
    let prev = Infinity;
    for (let s = 0; s <= 1.2; s += 0.05) {
      const y = islandProfileHeight(s, h);
      expect(y).toBeLessThanOrEqual(prev + 1e-9);
      prev = y;
    }
    expect(islandRings(h).length).toBeGreaterThan(4);
  });
  it("coast radius interpolates the polygon and the height follows it", () => {
    const r0 = coastRadiusAt(lab.coastline, CREATIVE_LAB_CENTER, 0);
    expect(r0).toBeGreaterThan(15);
    expect(r0).toBeLessThan(30);
    // Centre: plateau. On the coast polygon vertex: just under the water. Far outside: sea floor.
    expect(islandHeightAt(lab.coastline, CREATIVE_LAB_CENTER, lab.landHeight, CREATIVE_LAB_CENTER[0], CREATIVE_LAB_CENTER[1])).toBeGreaterThan(lab.landHeight + 1.5);
    const [vx, vz] = lab.coastline[3]!;
    expect(islandHeightAt(lab.coastline, CREATIVE_LAB_CENTER, lab.landHeight, vx, vz)).toBeLessThan(WATER_LEVEL);
    expect(islandHeightAt(lab.coastline, CREATIVE_LAB_CENTER, lab.landHeight, CREATIVE_LAB_CENTER[0] + 60, CREATIVE_LAB_CENTER[1])).toBeLessThan(WATER_LEVEL - 2);
  });
  it("builds a closed mesh: every vertex indexed, land vertices inside the coastline, colours by height", () => {
    const t = buildIslandTerrain(lab.coastline, CREATIVE_LAB_CENTER, lab.landHeight, 1);
    const count = t.positions.length / 3;
    expect(t.colors.length).toBe(count * 3);
    for (const i of t.indices) expect(i).toBeLessThan(count);
    expect(t.indices.length % 3).toBe(0);
    let land = 0;
    for (let v = 0; v < count; v++) {
      const y = t.positions[v * 3 + 1]!;
      if (y > WATER_LEVEL + 0.5) {
        land++;
        expect(insidePolygon(lab.coastline, t.positions[v * 3]!, t.positions[v * 3 + 2]!)).toBe(true);
      }
    }
    expect(land).toBeGreaterThan(lab.coastline.length * 3);
    expect(colorForHeight(WATER_LEVEL - 3, 0)).toEqual(colorForHeight(WATER_LEVEL - 2, 0));
    expect(colorForHeight(2, 0)).not.toEqual(colorForHeight(WATER_LEVEL + 0.2, 0));
  });
  it("the main coast skirt starts at the platform edge and ends under the water", () => {
    const main = getIsland("main");
    const t = buildCoastSkirt(main.coastline, 2);
    const count = t.positions.length / 3;
    const n = main.coastline.length;
    expect(count).toBe(n * 4);
    for (let i = 0; i < n; i++) {
      expect(Math.max(Math.abs(t.positions[i * 3]!), Math.abs(t.positions[i * 3 + 2]!))).toBeLessThanOrEqual(66 + 1e-6);
      expect(t.positions[i * 3 + 1]!).toBeCloseTo(-0.03, 6);
      expect(t.positions[(2 * n + i) * 3 + 1]!).toBeLessThan(WATER_LEVEL);
    }
    expect(t.indices.length).toBeGreaterThan(0);
    for (const i of t.indices) expect(i).toBeLessThan(count);
  });
  it("rocks sit along the waterline and respect the skip zones", () => {
    const rocks = coastRocks(lab.coastline, 3, { skip: (x) => x > CREATIVE_LAB_CENTER[0] + 20 });
    expect(rocks.length).toBeGreaterThan(10);
    for (const r of rocks) {
      expect(r.x).toBeLessThanOrEqual(CREATIVE_LAB_CENTER[0] + 20);
      expect(r.y).toBeLessThan(WATER_LEVEL + 0.1);
      expect(r.scale).toBeGreaterThan(0.5);
    }
  });
});

describe("terrain winding", () => {
  it("faces point up for both builders (same convention as the ocean grid)", () => {
    const up = (positions: Float32Array, indices: Uint32Array) => {
      let sum = 0;
      for (let k = 0; k < indices.length; k += 3) {
        const p = (i: number) => [positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!] as const;
        const [a, b, c] = [p(indices[k]!), p(indices[k + 1]!), p(indices[k + 2]!)];
        const ux = b[0] - a[0], uz = b[2] - a[2];
        const vx = c[0] - a[0], vz = c[2] - a[2];
        // y component of (b - a) x (c - a)
        sum += uz * vx - ux * vz;
      }
      return sum;
    };
    const lab = getIsland("creative-lab");
    const t = buildIslandTerrain(lab.coastline, CREATIVE_LAB_CENTER, lab.landHeight, 1);
    expect(up(t.positions, t.indices)).toBeGreaterThan(0);
    const s = buildCoastSkirt(getIsland("main").coastline, 2);
    expect(up(s.positions, s.indices)).toBeGreaterThan(0);
  });
});
