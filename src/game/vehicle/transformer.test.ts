import { describe, expect, it } from "vitest";
import {
  authorityOf,
  BOAT_ENTER_DEPTH,
  BOAT_EXIT_DEPTH,
  bodyModeOf,
  boatVelocityFromCar,
  canTransition,
  carSpeedFromBoat,
  DEPLOY_SPEED,
  DURATION,
  hopVelocity,
  launchPose,
  LOCKOUT,
  partsProgress,
  rampDecision,
  shoreDecision,
  stepHop,
  TAKEOFF_SPEED,
  type VehicleState,
} from "./transformer";

const ALL: VehicleState[] = ["car", "preparing-flight", "transforming-to-plane", "flying", "landing", "transforming-to-car", "transforming-to-boat", "floating", "exiting-water"];

describe("state machine", () => {
  it("every state has exactly one authority and one body mode", () => {
    for (const s of ALL) {
      expect(["car", "boat", "plane"]).toContain(authorityOf(s));
      expect(["car", "boat", "plane"]).toContain(bodyModeOf(s));
    }
    expect(authorityOf("flying")).toBe("plane");
    expect(authorityOf("floating")).toBe("boat");
    expect(authorityOf("transforming-to-plane")).toBe("car");
    expect(authorityOf("landing")).toBe("car");
  });
  it("only the designed edges exist: no car → flying, no floating → flying, no plane ↔ boat without water", () => {
    expect(canTransition("car", "flying")).toBe(false);
    expect(canTransition("floating", "flying")).toBe(false);
    expect(canTransition("floating", "transforming-to-plane")).toBe(false);
    expect(canTransition("car", "preparing-flight")).toBe(true);
    expect(canTransition("transforming-to-plane", "flying")).toBe(true);
    expect(canTransition("flying", "transforming-to-boat")).toBe(true);
    expect(canTransition("transforming-to-boat", "exiting-water")).toBe(true);
    expect(canTransition("transforming-to-boat", "transforming-to-plane")).toBe(false);
  });
  it("durations sit inside the brief's budget", () => {
    expect(DURATION["transforming-to-plane"]).toBeGreaterThanOrEqual(1.5);
    expect(DURATION["transforming-to-plane"]).toBeLessThanOrEqual(2.5);
    for (const d of Object.values(DURATION)) expect(d).toBeGreaterThan(0.5);
  });
});

describe("ramp rule", () => {
  const base = { inCorridor: true, aligned: true, speed: 16, pastLip: false, deployed: false, sinceLast: 10 };
  it("car in the corridor, aligned → prepare; wrong way → nothing", () => {
    expect(rampDecision({ ...base, state: "car" })).toBe("prepare");
    expect(rampDecision({ ...base, state: "car", aligned: false })).toBe(null);
    expect(rampDecision({ ...base, state: "car", inCorridor: false })).toBe(null);
  });
  it("preparing: deploys from the deploy speed, clears when the corridor is left", () => {
    expect(rampDecision({ ...base, state: "preparing-flight", speed: DEPLOY_SPEED - 1 })).toBe(null);
    expect(rampDecision({ ...base, state: "preparing-flight", speed: DEPLOY_SPEED })).toBe("deploy");
    expect(rampDecision({ ...base, state: "preparing-flight", inCorridor: false })).toBe("clear");
  });
  it("deploying: slowing down or turning away folds back before the lip", () => {
    expect(rampDecision({ ...base, state: "transforming-to-plane" })).toBe(null);
    expect(rampDecision({ ...base, state: "transforming-to-plane", speed: 5 })).toBe("abort");
    expect(rampDecision({ ...base, state: "transforming-to-plane", aligned: false })).toBe("abort");
  });
  it("at the lip: launch only with the wings out and the takeoff speed; otherwise a hop (car) or an abort (half-deployed)", () => {
    expect(rampDecision({ ...base, state: "transforming-to-plane", pastLip: true, deployed: true, speed: TAKEOFF_SPEED })).toBe("launch");
    expect(rampDecision({ ...base, state: "transforming-to-plane", pastLip: true, deployed: true, speed: TAKEOFF_SPEED - 0.1 })).toBe("abort");
    expect(rampDecision({ ...base, state: "transforming-to-plane", pastLip: true, deployed: false, speed: 20 })).toBe("abort");
    expect(rampDecision({ ...base, state: "car", pastLip: true, speed: 8 })).toBe("hop");
    expect(rampDecision({ ...base, state: "preparing-flight", pastLip: true, speed: 10 })).toBe("hop");
  });
  it("lockout after a transformation blocks a new preparation", () => {
    expect(rampDecision({ ...base, state: "car", sinceLast: LOCKOUT / 2 })).toBe(null);
  });
});

describe("shore rule with hysteresis", () => {
  const base = { onShore: true, sinceLast: 10 };
  it("a car entering the sea becomes a boat past the enter depth, not before, and only heading seaward", () => {
    expect(shoreDecision({ ...base, state: "car", depth: BOAT_ENTER_DEPTH - 0.05, seawardSpeed: 3 })).toBe(null);
    expect(shoreDecision({ ...base, state: "car", depth: BOAT_ENTER_DEPTH, seawardSpeed: 3 })).toBe("to-boat");
    expect(shoreDecision({ ...base, state: "car", depth: BOAT_ENTER_DEPTH + 1, seawardSpeed: -3 })).toBe(null);
    expect(shoreDecision({ ...base, state: "car", depth: 2, seawardSpeed: 3, onShore: false })).toBe(null);
  });
  it("a boat leaving the sea becomes a car under the exit depth heading landward; between the depths nothing changes", () => {
    expect(shoreDecision({ ...base, state: "floating", depth: BOAT_EXIT_DEPTH, seawardSpeed: -2 })).toBe("to-car");
    expect(shoreDecision({ ...base, state: "floating", depth: BOAT_EXIT_DEPTH + 0.1, seawardSpeed: -2 })).toBe(null);
    expect(shoreDecision({ ...base, state: "floating", depth: (BOAT_EXIT_DEPTH + BOAT_ENTER_DEPTH) / 2, seawardSpeed: 2 })).toBe(null);
    expect(shoreDecision({ ...base, state: "car", depth: (BOAT_EXIT_DEPTH + BOAT_ENTER_DEPTH) / 2, seawardSpeed: 2 })).toBe(null);
  });
  it("a running sequence can only be reversed by the opposite threshold", () => {
    expect(shoreDecision({ ...base, state: "transforming-to-boat", depth: BOAT_ENTER_DEPTH + 0.5, seawardSpeed: 3 })).toBe(null);
    expect(shoreDecision({ ...base, state: "transforming-to-boat", depth: BOAT_EXIT_DEPTH - 0.05, seawardSpeed: -2 })).toBe("to-car");
    expect(shoreDecision({ ...base, state: "exiting-water", depth: BOAT_EXIT_DEPTH, seawardSpeed: -2 })).toBe(null);
    expect(shoreDecision({ ...base, state: "exiting-water", depth: BOAT_ENTER_DEPTH + 0.1, seawardSpeed: 2 })).toBe("to-boat");
  });
  it("the lockout holds back a fresh entry but never the reversal", () => {
    expect(shoreDecision({ ...base, state: "car", depth: 2, seawardSpeed: 3, sinceLast: 0.2 })).toBe(null);
    expect(shoreDecision({ ...base, state: "transforming-to-boat", depth: 0.1, seawardSpeed: -2, sinceLast: 0 })).toBe("to-car");
  });
});

describe("hand-over maths", () => {
  it("launch keeps the ground speed as airspeed with a bounded nose-up pitch", () => {
    expect(launchPose(18, 0.4)).toEqual({ speed: 18, pitch: 0.4 });
    expect(launchPose(18, 1.2).pitch).toBe(0.45);
    expect(launchPose(18, 0).pitch).toBe(0.12);
    expect(launchPose(5, 0.3).speed).toBe(TAKEOFF_SPEED);
  });
  it("a hop rises with the slope then falls under gravity and lands on the ground", () => {
    const vy = hopVelocity(16, 0.4);
    expect(vy).toBeCloseTo(16 * Math.sin(0.4), 5);
    let y = 5;
    let v = vy;
    let landed = false;
    let t = 0;
    while (!landed && t < 5) {
      const r = stepHop(y, v, 0, 1 / 60);
      y = r.y;
      v = r.vy;
      landed = r.landed;
      t += 1 / 60;
    }
    expect(landed).toBe(true);
    expect(y).toBe(0);
    expect(t).toBeGreaterThan(0.5);
    expect(t).toBeLessThan(2);
  });
  it("car ⇄ boat velocity round-trips along the heading", () => {
    const h = 0.7;
    const v = boatVelocityFromCar(12, h);
    expect(carSpeedFromBoat(v.vx, v.vz, h)).toBeCloseTo(12, 6);
    expect(carSpeedFromBoat(v.vx, v.vz, h + Math.PI)).toBeCloseTo(-12, 6);
  });
  it("parts progress is eased, reversible and saturates", () => {
    expect(partsProgress("car", 0, 0)).toEqual({ wings: 0, floats: 0 });
    expect(partsProgress("transforming-to-plane", 0.85, 1.7).wings).toBeCloseTo(0.5, 6);
    expect(partsProgress("transforming-to-car", 0.75, 1.5).wings).toBeCloseTo(0.5, 6);
    expect(partsProgress("flying", 0, 0)).toEqual({ wings: 1, floats: 0 });
    expect(partsProgress("transforming-to-boat", 5, 1.1)).toEqual({ wings: 0, floats: 1 });
    expect(partsProgress("exiting-water", 0, 1.2).floats).toBe(1);
  });
});
