import { describe, expect, it } from "vitest";
import { beaches } from "@/data/beaches";
import { CAR_SPAWN } from "@/data/world";
import { landableAt } from "./landing";
import { recoveryPoints } from "./resetVehicle";

describe("recovery points", () => {
  it("the city spawn, the Skyport apron and the top of every beach, all on landable dry ground, facing inland", () => {
    const pts = recoveryPoints();
    expect(pts.length).toBe(2 + beaches.length);
    expect(pts[0]).toMatchObject({ x: CAR_SPAWN.position[0], z: CAR_SPAWN.position[1] });
    for (const p of pts) expect(landableAt(p.x, p.z), `${p.x},${p.z}`).toBe(true);
    const south = pts[2]!;
    expect(south.z).toBeLessThan(66);
    expect(Math.abs(Math.sin(south.heading))).toBeLessThan(1e-6);
    expect(Math.cos(south.heading)).toBeLessThan(0); // facing north, away from the sea
  });
});
