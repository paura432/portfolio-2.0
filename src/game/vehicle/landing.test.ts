import { describe, expect, it } from "vitest";
import { WATER_LEVEL } from "@/data/archipelago";
import { districts } from "@/data/districts";
import { rampPoint, ramps } from "@/data/ramps";
import { SKYPORT } from "@/data/skyport";
import { isSplashdown, landableAt, landingAhead, LANDING_FLOOR, terrainAt } from "./landing";

describe("landing rules", () => {
  it("open turf, roads and the runway are landable; buildings, ramps, the coast skirt and the sea are not", () => {
    expect(landableAt(-53, -20)).toBe(true); // west turf
    expect(landableAt(0, 27)).toBe(true); // south road
    expect(landableAt(150, -9)).toBe(true); // Skyport runway
    const ovi = districts.find((d) => d.id === "ovi")!;
    expect(landableAt(ovi.position[0], ovi.position[1])).toBe(false);
    for (const r of ramps) expect(landableAt(...rampPoint(r, r.length / 2, 0))).toBe(false);
    expect(landableAt(70, 50)).toBe(false); // skirt / sea off the south-east corner
    expect(landableAt(-150, -100)).toBe(false);
  });
  it("deep water is a splashdown, the city is not", () => {
    expect(isSplashdown(-150, -100)).toBe(true);
    expect(isSplashdown(0, 0)).toBe(false);
    expect(isSplashdown(26, 100)).toBe(true);
  });
  it("the terrain query gives the ground to landable spots, the water surface to the sea, a floor elsewhere", () => {
    expect(terrainAt(-53, -20)).toEqual({ groundY: 0, canLand: true, floorY: 0 });
    expect(terrainAt(-150, -100)).toEqual({ groundY: WATER_LEVEL, canLand: true, floorY: WATER_LEVEL });
    const ovi = districts.find((d) => d.id === "ovi")!;
    const over = terrainAt(ovi.position[0], ovi.position[1]);
    expect(over.canLand).toBe(false);
    expect(over.floorY).toBe(LANDING_FLOOR);
    const hangar = terrainAt(SKYPORT.hangar.x, SKYPORT.hangar.z);
    expect(hangar.canLand).toBe(false);
  });
  it("landing ahead needs two clear samples down the heading, on land or on water", () => {
    expect(landingAhead(-53, -40, 0)).toBe(true); // heading south down the west turf
    expect(landingAhead(-200, -100, 0)).toBe(true); // open sea
    const ovi = districts.find((d) => d.id === "ovi")!;
    expect(landingAhead(ovi.position[0], ovi.position[1] - 10, 0)).toBe(false); // into the OVI block
  });
});
