import { describe, expect, it } from "vitest";
import { districts } from "./districts";
import { projects } from "./projects";
import { CAR_SPAWN, PLATFORM, PLAZA, distanceToRoad } from "./world";
import { boxFromFootprint, resolveCollisions } from "@/game/physics/collision";
import { CAR_RADIUS, DRIVE_HALF_SIZE, obstacles } from "@/game/world/obstacles";

describe("content data", () => {
  it("has unique project slugs", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("every project district points to an existing project", () => {
    for (const d of districts.filter((x) => x.kind === "project")) {
      expect(projects.some((p) => p.slug === d.projectSlug), d.id).toBe(true);
    }
  });
  it("builds every district on the map", () => {
    expect(districts.filter((d) => d.built).map((d) => d.id)).toEqual(["hub", "duplex", "ovi", "broki", "trustos", "fortytwo", "contact"]);
  });
});

describe("world layout", () => {
  it("every district entrance sits on a road", () => {
    for (const d of districts) {
      expect(distanceToRoad(d.entrance[0], d.entrance[1]), d.id).toBeLessThanOrEqual(0.5);
    }
  });
  it("the spawn point is on a road and inside the platform", () => {
    expect(distanceToRoad(CAR_SPAWN.position[0], CAR_SPAWN.position[1])).toBe(0);
    expect(Math.abs(CAR_SPAWN.position[0])).toBeLessThan(PLATFORM.driveHalfSize);
  });
  it("buildings do not overlap each other or the roads", () => {
    const boxes = districts.map((d) => boxFromFootprint(d.id, d.position, d.footprint));
    for (const a of boxes) {
      if (a.id === "hub") {
        // Round pavilion inside the plaza: its radius must stay inside the inner ring.
        const hub = districts.find((d) => d.id === "hub")!;
        expect(hub.footprint[0] / 2).toBeLessThan(PLAZA.innerRadius - 1);
        continue;
      }
      for (const b of boxes) {
        if (a.id === b.id) continue;
        const overlap = a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
        expect(overlap, `${a.id} vs ${b.id}`).toBe(false);
      }
      // Sample the box edge against the road network: no road should enter a building.
      for (let t = 0; t <= 1; t += 0.1) {
        const x = a.minX + (a.maxX - a.minX) * t;
        const z = a.minZ + (a.maxZ - a.minZ) * t;
        expect(distanceToRoad(x, a.minZ), a.id).toBeGreaterThan(0.5);
        expect(distanceToRoad(x, a.maxZ), a.id).toBeGreaterThan(0.5);
        expect(distanceToRoad(a.minX, z), a.id).toBeGreaterThan(0.5);
        expect(distanceToRoad(a.maxX, z), a.id).toBeGreaterThan(0.5);
      }
    }
  });
  it("the interaction zone of each built district is reachable from the road", () => {
    for (const d of districts.filter((x) => x.built)) {
      // The car must be able to stand at the entrance without being pushed out.
      const r = resolveCollisions({ x: d.entrance[0], z: d.entrance[1], r: CAR_RADIUS }, obstacles, DRIVE_HALF_SIZE);
      expect(r.hits, d.id).toEqual([]);
      expect(r.boundary, d.id).toBe(false);
    }
    expect(resolveCollisions({ x: CAR_SPAWN.position[0], z: CAR_SPAWN.position[1], r: CAR_RADIUS }, obstacles, DRIVE_HALF_SIZE).hits).toEqual([]);
  });
});
