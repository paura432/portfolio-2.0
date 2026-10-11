import { describe, expect, it } from "vitest";
import type { DriveInput } from "../controls/input";
import { BOAT_CONFIG, boatSpeed, createBoatState, forwardSpeed, lateralSpeed, stepBoat, terminalSpeed, type BoatState } from "./boatPhysics";

const idle: DriveInput = { throttle: 0, steer: 0, brake: false };
const full: DriveInput = { throttle: 1, steer: 0, brake: false };

function run(s: BoatState, input: DriveInput, seconds: number, dt = 1 / 60, constrain?: Parameters<typeof stepBoat>[4]): BoatState {
  for (let t = 0; t < seconds; t += dt) s = stepBoat(s, input, dt, BOAT_CONFIG, constrain);
  return s;
}

describe("boat physics", () => {
  it("accelerates progressively, never instantly", () => {
    const s0 = createBoatState(0, 0, 0);
    const s1 = stepBoat(s0, full, 1 / 60);
    expect(forwardSpeed(s1)).toBeGreaterThan(0);
    expect(forwardSpeed(s1)).toBeLessThan(0.5);
    const s2 = run(s0, full, 2);
    const s3 = run(s0, full, 4);
    expect(forwardSpeed(s2)).toBeGreaterThan(forwardSpeed(s1));
    expect(forwardSpeed(s3)).toBeGreaterThan(forwardSpeed(s2));
  });
  it("settles at a terminal speed where thrust balances drag, below the cap", () => {
    const s = run(createBoatState(0, 0, 0), full, 40);
    expect(Math.abs(forwardSpeed(s) - terminalSpeed())).toBeLessThan(0.3);
    expect(forwardSpeed(s)).toBeLessThanOrEqual(BOAT_CONFIG.maxSpeed);
    expect(forwardSpeed(s)).toBeGreaterThan(10);
  });
  it("keeps gliding when the throttle is released (inertia), then slows down", () => {
    const moving = run(createBoatState(0, 0, 0), full, 6);
    const v0 = forwardSpeed(moving);
    const coast1 = run(moving, idle, 1);
    const coast4 = run(moving, idle, 4);
    expect(forwardSpeed(coast1)).toBeGreaterThan(v0 * 0.6);
    expect(forwardSpeed(coast1)).toBeLessThan(v0);
    expect(forwardSpeed(coast4)).toBeLessThan(forwardSpeed(coast1));
    expect(forwardSpeed(coast4)).toBeGreaterThan(0.5);
    expect(coast4.z).toBeGreaterThan(moving.z + 10);
  });
  it("brakes faster than it coasts and reverses slowly", () => {
    const moving = run(createBoatState(0, 0, 0), full, 6);
    const braked = run(moving, { ...idle, brake: true }, 2);
    const coasted = run(moving, idle, 2);
    expect(forwardSpeed(braked)).toBeLessThan(forwardSpeed(coasted));
    const reversed = run(createBoatState(0, 0, 0), { ...idle, throttle: -1 }, 15);
    expect(forwardSpeed(reversed)).toBeLessThan(0);
    expect(-forwardSpeed(reversed)).toBeLessThanOrEqual(BOAT_CONFIG.maxReverseSpeed + 1e-6);
    expect(-forwardSpeed(reversed)).toBeLessThan(terminalSpeed() / 2);
  });
  it("turns more at speed than at rest, and never spins in place with the throttle off", () => {
    const still = run(createBoatState(0, 0, 0), { ...idle, steer: 1 }, 2);
    expect(Math.abs(still.heading)).toBeLessThan(0.01);
    const moving = run(createBoatState(0, 0, 0), full, 5);
    const turned = run(moving, { ...full, steer: 1 }, 2);
    expect(Math.abs(turned.heading - moving.heading)).toBeGreaterThan(0.8);
    // Steering from rest with throttle works a little (propeller wash) but far less than at speed.
    const fromRest = run(createBoatState(0, 0, 0), { ...full, steer: 1 }, 1);
    expect(Math.abs(fromRest.heading)).toBeGreaterThan(0.02);
    expect(Math.abs(fromRest.heading)).toBeLessThan(Math.abs(turned.heading - moving.heading));
  });
  it("drifts sideways through a fast turn and the slip decays afterwards", () => {
    const moving = run(createBoatState(0, 0, 0), full, 6);
    const turning = run(moving, { ...full, steer: 1 }, 1);
    expect(Math.abs(lateralSpeed(turning))).toBeGreaterThan(0.3);
    const straight = run(turning, full, 3);
    expect(Math.abs(lateralSpeed(straight))).toBeLessThan(Math.abs(lateralSpeed(turning)) * 0.3);
  });
  it("is frame-rate independent", () => {
    const a = run(createBoatState(0, 0, 0), { ...full, steer: 0.5 }, 5, 1 / 30);
    const b = run(createBoatState(0, 0, 0), { ...full, steer: 0.5 }, 5, 1 / 120);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1.5);
    expect(Math.abs(a.heading - b.heading)).toBeLessThan(0.08);
  });
  it("clamps huge frame gaps (tab switch) instead of teleporting", () => {
    const s = stepBoat(run(createBoatState(0, 0, 0), full, 6), full, 5);
    expect(boatSpeed(s)).toBeLessThanOrEqual(BOAT_CONFIG.maxSpeed);
    expect(s.z).toBeLessThan(200);
  });
  it("stops at a wall, keeps a small bounce, records the bump, and is never thrown or stuck", () => {
    // A wall at z = 20: anything beyond is pushed back to z = 20.
    const wall: Parameters<typeof stepBoat>[4] = (x, z) => (z > 20 ? { x, z: 20, blocked: true } : { x, z, blocked: false });
    let s = createBoatState(0, 0, 0);
    let maxBump = 0;
    for (let t = 0; t < 6; t += 1 / 60) {
      s = stepBoat(s, full, 1 / 60, BOAT_CONFIG, wall);
      maxBump = Math.max(maxBump, s.bump);
    }
    expect(s.z).toBeLessThanOrEqual(20 + 1e-6);
    expect(maxBump).toBeGreaterThan(3);
    // Pressing into the wall: the hull sits against it at low speed, no runaway.
    expect(boatSpeed(s)).toBeLessThan(2);
    // Reverse away: not stuck.
    const back = run(s, { ...idle, throttle: -1 }, 2, 1 / 60, wall);
    expect(back.z).toBeLessThan(19);
  });
});
