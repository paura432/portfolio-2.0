import { describe, expect, it } from "vitest";
import { OCEAN_EXTENT, SEA_BOUNDS } from "@/data/archipelago";
import { axisCoordinates, buildOceanGrid, OCEAN_SPACING, triangleCount } from "./oceanMesh";

describe("ocean grid", () => {
  it("is dense inside the navigation bounds and coarse out to the extent, monotonic, covering the far plane", () => {
    const xs = axisCoordinates(SEA_BOUNDS.minX, SEA_BOUNDS.maxX, 5, OCEAN_EXTENT.centerX - OCEAN_EXTENT.halfWidth, OCEAN_EXTENT.centerX + OCEAN_EXTENT.halfWidth);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    expect(xs[0]).toBe(OCEAN_EXTENT.centerX - OCEAN_EXTENT.halfWidth);
    expect(xs[xs.length - 1]).toBe(OCEAN_EXTENT.centerX + OCEAN_EXTENT.halfWidth);
    const inner = xs.filter((x) => x >= SEA_BOUNDS.minX && x <= SEA_BOUNDS.maxX);
    for (let i = 1; i < inner.length; i++) expect(inner[i]! - inner[i - 1]!).toBeLessThanOrEqual(5 + 1e-9);
    // The extent reaches beyond the camera far plane (240) from every point of the bounds.
    expect(OCEAN_EXTENT.centerX - OCEAN_EXTENT.halfWidth).toBeLessThan(SEA_BOUNDS.minX - 150);
    expect(OCEAN_EXTENT.centerZ + OCEAN_EXTENT.halfDepth).toBeGreaterThan(SEA_BOUNDS.maxZ + 150);
  });
  it("builds a watertight indexed grid with a shore attribute per vertex, within the triangle budget per tier", () => {
    const shore = (x: number, z: number) => Math.hypot(x, z) - 70;
    const g = buildOceanGrid(OCEAN_SPACING.low, SEA_BOUNDS, OCEAN_EXTENT, shore);
    expect(g.positions.length).toBe(g.columns * g.rows * 3);
    expect(g.shore.length).toBe(g.columns * g.rows);
    expect(g.indices.length).toBe((g.columns - 1) * (g.rows - 1) * 6);
    for (const i of g.indices) expect(i).toBeLessThan(g.columns * g.rows);
    // Shore is clamped so the attribute stays in a shader-friendly range.
    for (const s of g.shore) {
      expect(s).toBeGreaterThanOrEqual(-8);
      expect(s).toBeLessThanOrEqual(80);
    }
    expect(g.shore[0]).toBe(80); // far corner
    const low = triangleCount(g);
    const medium = triangleCount(buildOceanGrid(OCEAN_SPACING.medium, SEA_BOUNDS, OCEAN_EXTENT, shore));
    const high = triangleCount(buildOceanGrid(OCEAN_SPACING.high, SEA_BOUNDS, OCEAN_EXTENT, shore));
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
    expect(high).toBeLessThan(60_000);
    expect(low).toBeLessThan(10_000);
  });
  it("faces point up (counter-clockwise seen from above)", () => {
    const g = buildOceanGrid(50, SEA_BOUNDS, OCEAN_EXTENT, () => 50);
    const [a, b, c] = [g.indices[0]!, g.indices[1]!, g.indices[2]!];
    const p = (i: number) => [g.positions[i * 3]!, g.positions[i * 3 + 2]!] as const;
    const [ax, az] = p(a);
    const [bx, bz] = p(b);
    const [cx, cz] = p(c);
    // Cross product sign on the XZ plane for an up-facing triangle (y = (c-a) x (b-a) with three.js winding).
    const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    expect(cross).toBeLessThan(0);
  });
});

describe("ocean grid density", () => {
  it("is 1 deep inside the bounds and 0 on the coarse ring", async () => {
    const { buildOceanGrid, DENSE_FADE } = await import("./oceanMesh");
    const { SEA_BOUNDS, OCEAN_EXTENT } = await import("@/data/archipelago");
    const g = buildOceanGrid(10, SEA_BOUNDS, OCEAN_EXTENT, () => 50);
    let inside = 0;
    let ring = 0;
    for (let v = 0; v < g.dense.length; v++) {
      const x = g.positions[v * 3]!;
      const z = g.positions[v * 3 + 2]!;
      const edge = Math.min(x - SEA_BOUNDS.minX, SEA_BOUNDS.maxX - x, z - SEA_BOUNDS.minZ, SEA_BOUNDS.maxZ - z);
      if (edge >= DENSE_FADE) {
        expect(g.dense[v]).toBe(1);
        inside++;
      } else if (edge <= 0) {
        expect(g.dense[v]).toBe(0);
        ring++;
      }
    }
    expect(inside).toBeGreaterThan(0);
    expect(ring).toBeGreaterThan(0);
  });
});
