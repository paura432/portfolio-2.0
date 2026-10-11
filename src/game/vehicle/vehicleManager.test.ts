import { describe, expect, it } from "vitest";
import { applyTransition, BOARDING_MAX_SPEED, canBoard, canControl, canDock, carAvailableAt, DOCKING_MAX_SPEED, makeTransition, resolveVehicleMode, transitionClock, type VehicleSnapshot } from "./vehicleManager";
import { getHarbor } from "@/data/archipelago";

const base: VehicleSnapshot = { activeVehicle: "car", transition: null, mooredAt: null, nearbyHarbor: null, nearbyDock: null };

describe("vehicle modes (derived from the single store state machine)", () => {
  it("names every state explicitly", () => {
    expect(resolveVehicleMode("playing", base)).toBe("driving-car");
    expect(resolveVehicleMode("playing", { ...base, nearbyHarbor: "pau-harbor" })).toBe("approaching-dock");
    expect(resolveVehicleMode("playing", { ...base, transition: makeTransition("board", "pau-harbor") })).toBe("boarding");
    expect(resolveVehicleMode("playing", { ...base, activeVehicle: "boat" })).toBe("driving-boat");
    expect(resolveVehicleMode("playing", { ...base, activeVehicle: "boat", nearbyDock: "creative-lab-pier" })).toBe("docking");
    expect(resolveVehicleMode("playing", { ...base, activeVehicle: "boat", mooredAt: "creative-lab-pier" })).toBe("docking");
    expect(resolveVehicleMode("playing", { ...base, activeVehicle: "boat", transition: makeTransition("disembark", "pau-harbor") })).toBe("disembarking");
    expect(resolveVehicleMode("playing", { ...base, activeVehicle: "boat", transition: makeTransition("moor", "creative-lab-pier") })).toBe("docking");
  });
  it("is paused in every non-playing phase", () => {
    for (const phase of ["intro", "panel", "menu"] as const) {
      expect(resolveVehicleMode(phase, base)).toBe("vehicle-paused");
      expect(resolveVehicleMode(phase, { ...base, activeVehicle: "boat" })).toBe("vehicle-paused");
    }
  });
});

describe("control ownership", () => {
  it("exactly one vehicle answers to the controls, and none during transitions, panels or while moored", () => {
    expect(canControl("car", "playing", base)).toBe(true);
    expect(canControl("boat", "playing", base)).toBe(false);
    const boat = { ...base, activeVehicle: "boat" as const };
    expect(canControl("boat", "playing", boat)).toBe(true);
    expect(canControl("car", "playing", boat)).toBe(false);
    expect(canControl("car", "panel", base)).toBe(false);
    expect(canControl("car", "playing", { ...base, transition: makeTransition("board", "pau-harbor") })).toBe(false);
    expect(canControl("boat", "playing", { ...base, activeVehicle: "boat", transition: makeTransition("board", "pau-harbor") })).toBe(false);
    expect(canControl("boat", "playing", { ...boat, mooredAt: "creative-lab-pier" })).toBe(false);
  });
});

describe("boarding and docking rules", () => {
  it("needs the zone and a slow vehicle (no accidental boarding at speed)", () => {
    expect(canBoard(0, "pau-harbor")).toBe(true);
    expect(canBoard(BOARDING_MAX_SPEED, "pau-harbor")).toBe(true);
    expect(canBoard(BOARDING_MAX_SPEED + 0.1, "pau-harbor")).toBe(false);
    expect(canBoard(12, "pau-harbor")).toBe(false);
    expect(canBoard(0, null)).toBe(false);
    expect(canDock(1, "creative-lab-pier")).toBe(true);
    expect(canDock(DOCKING_MAX_SPEED + 0.5, "creative-lab-pier")).toBe(false);
    expect(canDock(0, null)).toBe(false);
  });
  it("hands the controls back to the car only where a car is actually parked", () => {
    const h = getHarbor("pau-harbor");
    expect(carAvailableAt("pau-harbor", h.pierRoot[0] + 4, h.pierRoot[1])).toBe(true);
    // The car is parked across the island: it did not travel in the boat.
    expect(carAvailableAt("pau-harbor", 0, 27)).toBe(false);
    // The second island has no land vehicle, wherever the car is.
    const p = getHarbor("creative-lab-pier");
    expect(carAvailableAt("creative-lab-pier", p.pierRoot[0], p.pierRoot[1])).toBe(false);
  });
});

describe("transitions", () => {
  it("map from/to vehicles and have a duration", () => {
    expect(makeTransition("board", "pau-harbor")).toMatchObject({ from: "car", to: "boat" });
    expect(makeTransition("disembark", "pau-harbor")).toMatchObject({ from: "boat", to: "car" });
    expect(makeTransition("moor", "creative-lab-pier")).toMatchObject({ from: "boat", to: "boat" });
    expect(makeTransition("cast-off", "creative-lab-pier").duration).toBeGreaterThan(0);
  });
  it("completing a transition lands in the right state", () => {
    expect(applyTransition({ ...base, transition: makeTransition("board", "pau-harbor") })).toEqual({ activeVehicle: "boat", transition: null, mooredAt: null });
    expect(applyTransition({ ...base, activeVehicle: "boat", transition: makeTransition("disembark", "pau-harbor") })).toEqual({ activeVehicle: "car", transition: null, mooredAt: null });
    expect(applyTransition({ ...base, activeVehicle: "boat", transition: makeTransition("moor", "creative-lab-pier") })).toEqual({ activeVehicle: "boat", transition: null, mooredAt: "creative-lab-pier" });
    expect(applyTransition({ ...base, activeVehicle: "boat", mooredAt: "creative-lab-pier", transition: makeTransition("cast-off", "creative-lab-pier") })).toEqual({ activeVehicle: "boat", transition: null, mooredAt: null });
    expect(applyTransition(base).activeVehicle).toBe("car");
  });
  it("progress eases from 0 to 1 over the duration", () => {
    const t = makeTransition("board", "pau-harbor");
    transitionClock.current = t;
    transitionClock.t = 0;
    expect(transitionClock.progress()).toBe(0);
    transitionClock.t = t.duration / 2;
    expect(transitionClock.progress()).toBeCloseTo(0.5, 5);
    transitionClock.t = t.duration * 2;
    expect(transitionClock.progress()).toBe(1);
    transitionClock.current = null;
    expect(transitionClock.progress()).toBe(0);
  });
});
