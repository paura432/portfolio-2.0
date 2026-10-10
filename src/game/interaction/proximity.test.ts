import { describe, expect, it } from "vitest";
import { resolveActiveZone } from "./proximity";

const zones = [
  { id: "a", x: 0, z: 0, radius: 5 },
  { id: "b", x: 20, z: 0, radius: 5 },
];

describe("resolveActiveZone", () => {
  it("returns null outside every zone", () => {
    expect(resolveActiveZone(zones, 10, 0, null)).toBeNull();
  });
  it("enters a zone at its radius", () => {
    expect(resolveActiveZone(zones, 4.9, 0, null)).toBe("a");
  });
  it("keeps the active zone slightly beyond the radius (hysteresis)", () => {
    expect(resolveActiveZone(zones, 5.8, 0, "a")).toBe("a");
    expect(resolveActiveZone(zones, 5.8, 0, null)).toBeNull();
    expect(resolveActiveZone(zones, 6.5, 0, "a")).toBeNull();
  });
  it("picks the nearest when overlapping", () => {
    const wide = [
      { id: "a", x: 0, z: 0, radius: 15 },
      { id: "b", x: 20, z: 0, radius: 15 },
    ];
    expect(resolveActiveZone(wide, 12, 0, null)).toBe("b");
  });
});
