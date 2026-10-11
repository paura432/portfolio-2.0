import { describe, expect, it } from "vitest";
import { rampPoint, ramps } from "@/data/ramps";
import { SKYPORT } from "@/data/skyport";
import { buildSignposts } from "./signposts";
import { fixture, fixtures } from "./fixtures";
import { CAR_RADIUS, clampToDriveArea, obstacles } from "./obstacles";
import { resolveCollisions } from "../physics/collision";

describe("V9 fixtures (component-drawn destructible posts)", () => {
  it("lists the 4 plaza signposts, 6 ramp masts, 3 ramp sign posts, 4 pad masts, the hangar sign and the harbor gate sign", () => {
    const f = fixtures();
    expect(f.length).toBe(19);
    expect(f.filter((x) => x.category === "mast").length).toBe(10);
    expect(new Set(f.map((x) => x.key)).size).toBe(19);
  });
  it("stands exactly where the components draw them", () => {
    for (const s of buildSignposts()) {
      const f = fixture(`plaza:${s.exit}`);
      expect([f.x, f.z, f.rotation]).toEqual([s.x, s.z, s.rotationY]);
    }
    for (const r of ramps) {
      const [lx, lz] = rampPoint(r, -r.approach, -(r.width / 2 + 0.9));
      expect([fixture(`ramp:${r.id}:mast:l`).x, fixture(`ramp:${r.id}:mast:l`).z]).toEqual([lx, lz]);
      const [sx, sz] = rampPoint(r, -r.approach + 1, r.width / 2 + 2.2);
      expect([fixture(`ramp:${r.id}:sign`).x, fixture(`ramp:${r.id}:sign`).z]).toEqual([sx, sz]);
    }
    const pad0 = fixture("skyport:pad:0");
    expect(Math.hypot(pad0.x - SKYPORT.pad.x, pad0.z - SKYPORT.pad.z)).toBeCloseTo(SKYPORT.pad.radius + 1.2, 6);
  });
  it("no fixture stands inside a building collider or outside the drive area while being reachable by the car", () => {
    for (const f of fixtures()) {
      expect(resolveCollisions({ x: f.x, z: f.z, r: 0.2 }, obstacles, Infinity).hits, f.key).toEqual([]);
    }
    // Reachable ones (the audit): pad masts, hangar sign, harbor gate sign, plaza signposts.
    for (const key of ["plaza:west", "plaza:east", "plaza:north", "plaza:south", "skyport:pad:0", "skyport:hangar-sign", "harbor:gate-sign"]) {
      const f = fixture(key);
      expect(clampToDriveArea(f.x, f.z, CAR_RADIUS).boundary, key).toBe(false);
    }
  });
});
