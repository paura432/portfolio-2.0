import { beforeEach, describe, expect, it } from "vitest";
import { createBoatState } from "./boatPhysics";
import { liveBoat } from "./boatState";
import { createCarState } from "./carPhysics";
import { liveCar } from "./carState";
import { liveVehicle } from "./liveVehicle";
import { createPlaneState } from "./planePhysics";
import { livePlane } from "./planeState";
import { applyTransition, canControl, canDock, DOCKING_MAX_SPEED, makeTransition, poseOf, resolveVehicleMode, type VehicleSnapshot } from "./vehicleManager";

const base: VehicleSnapshot = { vehicleState: "car", transition: null, mooredAt: null, nearbyDock: null };

describe("vehicle manager (V8)", () => {
  beforeEach(() => {
    liveCar.state = createCarState(1, 2, 0.5);
    liveBoat.state = createBoatState(10, 20, 1.0);
    liveBoat.visual.y = 0.3;
    livePlane.state = { ...createPlaneState(100, 30, 200, 1.5), speed: 24, onGround: false, pitch: 0.2 };
    liveVehicle.y = 0.7;
    liveVehicle.groundPitch = 0.1;
  });

  it("derives the mode from the phase, the glide, the mooring and the state", () => {
    expect(resolveVehicleMode("intro", base)).toBe("paused");
    expect(resolveVehicleMode("panel", { ...base, vehicleState: "flying" })).toBe("paused");
    expect(resolveVehicleMode("playing", base)).toBe("car");
    expect(resolveVehicleMode("playing", { ...base, vehicleState: "flying" })).toBe("flying");
    expect(resolveVehicleMode("playing", { ...base, vehicleState: "floating", nearbyDock: "creative-lab-pier" })).toBe("docking");
    expect(resolveVehicleMode("playing", { ...base, vehicleState: "floating", mooredAt: "creative-lab-pier" })).toBe("moored");
    expect(resolveVehicleMode("playing", { ...base, vehicleState: "floating", transition: makeTransition("moor", "pau-harbor") })).toBe("docking");
  });

  it("the vehicle answers to the controls while playing, except during a pier glide or when tied up; transformations never lock it", () => {
    expect(canControl("playing", base)).toBe(true);
    expect(canControl("playing", { ...base, vehicleState: "transforming-to-plane" })).toBe(true);
    expect(canControl("playing", { ...base, vehicleState: "transforming-to-boat" })).toBe(true);
    expect(canControl("menu", base)).toBe(false);
    expect(canControl("playing", { ...base, transition: makeTransition("moor", "pau-harbor") })).toBe(false);
    expect(canControl("playing", { ...base, vehicleState: "floating", mooredAt: "pau-harbor" })).toBe(false);
  });

  it("docking needs a slow hull inside a zone; a glide completes to moored, a cast-off to free", () => {
    expect(canDock(DOCKING_MAX_SPEED, "pau-harbor")).toBe(true);
    expect(canDock(DOCKING_MAX_SPEED + 0.1, "pau-harbor")).toBe(false);
    expect(canDock(1, null)).toBe(false);
    expect(applyTransition({ ...base, transition: makeTransition("moor", "skyport-pier") })).toEqual({ transition: null, mooredAt: "skyport-pier" });
    expect(applyTransition({ ...base, mooredAt: "skyport-pier", transition: makeTransition("cast-off", "skyport-pier") })).toEqual({ transition: null, mooredAt: null });
    expect(applyTransition(base)).toEqual({ transition: null, mooredAt: null });
  });

  it("poseOf reads the physics model that owns the position in each state", () => {
    expect(poseOf("car")).toMatchObject({ x: 1, z: 2, y: 0.7, heading: 0.5, pitch: 0.1 });
    expect(poseOf("transforming-to-plane")).toMatchObject({ x: 1, z: 2 });
    expect(poseOf("landing")).toMatchObject({ x: 1, z: 2 });
    expect(poseOf("floating")).toMatchObject({ x: 10, z: 20, y: 0.3, heading: 1.0 });
    expect(poseOf("transforming-to-boat")).toMatchObject({ x: 10, z: 20 });
    expect(poseOf("flying")).toMatchObject({ x: 100, y: 30, z: 200, heading: 1.5, speed: 24, pitch: 0.2 });
  });
});
