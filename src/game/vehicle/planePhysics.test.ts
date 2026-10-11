import { describe, expect, it } from "vitest";
import type { DriveInput } from "../controls/input";
import { altitudeAbove, createPlaneState, noseVector, PLANE_CONFIG, stepPlane, type PlaneState, type TerrainQuery } from "./planePhysics";

const idle: DriveInput = { throttle: 0, steer: 0, brake: false };
const climb: DriveInput = { throttle: 1, steer: 0, brake: false };
const dive: DriveInput = { throttle: -1, steer: 0, brake: false };

/** A runway from x = 0 to 80 at z ∈ [−5, 5] on a ground at y = 0; everywhere else is not a landing spot with a floor at 14. */
const runwayWorld: TerrainQuery = (x, z) => (x >= 0 && x <= 80 && Math.abs(z) <= 5 ? { groundY: 0, canLand: true, floorY: 0 } : { groundY: 0, canLand: false, floorY: 14 });

function run(s: PlaneState, input: DriveInput, seconds: number, terrain: TerrainQuery = runwayWorld, dt = 1 / 60) {
  let touchedDown = false;
  let liftedOff = false;
  let floorHit = false;
  for (let t = 0; t < seconds; t += dt) {
    const r = stepPlane(s, input, dt, terrain);
    s = r.state;
    touchedDown ||= r.touchedDown;
    liftedOff ||= r.liftedOff;
    floorHit ||= r.floorHit;
  }
  return { s, touchedDown, liftedOff, floorHit };
}

describe("plane physics: ground run and takeoff", () => {
  it("accelerates on the runway, rotates past the takeoff speed and lifts off", () => {
    const start = createPlaneState(2, 0, 0, Math.PI / 2); // heading +X along the strip
    const { s, liftedOff } = run(start, climb, 4);
    expect(liftedOff).toBe(true);
    expect(s.onGround).toBe(false);
    expect(s.speed).toBeGreaterThanOrEqual(PLANE_CONFIG.takeoffSpeed);
    expect(s.pitch).toBeGreaterThan(0.1);
    expect(s.x).toBeGreaterThan(start.x + 10);
    expect(s.z).toBeCloseTo(0, 1);
  });
  it("never leaves the ground without a run-up or without throttle", () => {
    const start = createPlaneState(2, 0, 0, Math.PI / 2);
    const one = stepPlane(start, climb, 1 / 60, runwayWorld);
    expect(one.state.onGround).toBe(true);
    expect(one.liftedOff).toBe(false);
    const coasting = run({ ...start, speed: PLANE_CONFIG.takeoffSpeed + 2 }, idle, 2);
    expect(coasting.liftedOff).toBe(false);
    expect(coasting.s.speed).toBeLessThan(PLANE_CONFIG.takeoffSpeed + 2);
  });
  it("brakes and steers on the ground", () => {
    const rolling = { ...createPlaneState(10, 0, 0, Math.PI / 2), speed: 10 };
    const braked = run(rolling, { ...idle, brake: true }, 2);
    expect(braked.s.speed).toBe(0);
    const steered = run(rolling, { ...idle, steer: 1 }, 1);
    expect(steered.s.heading).toBeLessThan(rolling.heading);
  });
});

describe("plane physics: flight", () => {
  const airborne: PlaneState = { ...createPlaneState(40, 20, 0, Math.PI / 2), speed: PLANE_CONFIG.cruiseSpeed, onGround: false };
  it("holds altitude and settles at cruise speed hands-off", () => {
    const { s, touchedDown, floorHit } = run(airborne, idle, 8);
    expect(touchedDown).toBe(false);
    expect(floorHit).toBe(false);
    expect(Math.abs(s.y - airborne.y)).toBeLessThan(2.5);
    expect(Math.abs(s.speed - PLANE_CONFIG.cruiseSpeed)).toBeLessThan(0.5);
    expect(Math.abs(s.pitch)).toBeLessThan(0.02);
  });
  it("climbs with W (bleeding some speed) and descends with S, within the pitch limits", () => {
    const up = run(airborne, climb, 3);
    expect(up.s.y).toBeGreaterThan(airborne.y + 5);
    expect(up.s.pitch).toBeLessThanOrEqual(PLANE_CONFIG.maxClimbPitch + 1e-6);
    expect(up.s.speed).toBeLessThan(PLANE_CONFIG.cruiseSpeed + PLANE_CONFIG.climbThrust);
    const down = run({ ...airborne, y: 60 }, dive, 3);
    expect(down.s.y).toBeLessThan(60 - 5);
    expect(down.s.pitch).toBeGreaterThanOrEqual(PLANE_CONFIG.maxDivePitch - 1e-6);
  });
  it("turns through its bank and levels the wings when released", () => {
    const left = run(airborne, { ...idle, steer: -1 }, 2);
    expect(left.s.roll).toBeGreaterThan(0.5);
    expect(left.s.heading).toBeGreaterThan(airborne.heading + 0.4);
    const right = run(airborne, { ...idle, steer: 1 }, 2);
    expect(right.s.heading).toBeLessThan(airborne.heading - 0.4);
    const levelled = run(left.s, idle, 2);
    expect(Math.abs(levelled.s.roll)).toBeLessThan(0.05);
  });
  it("respects the speed cap and the ceiling", () => {
    const fast = run({ ...airborne, y: 80, speed: 5 }, dive, 10, () => ({ groundY: 0, canLand: false, floorY: 14 }));
    expect(fast.s.speed).toBeLessThanOrEqual(PLANE_CONFIG.maxSpeed);
    const high = run({ ...airborne, y: 90 }, climb, 10);
    expect(high.s.y).toBeLessThanOrEqual(PLANE_CONFIG.maxAltitude + 1e-6);
  });
  it("stalls gently: below the stall speed the nose drops and height is lost, then it recovers speed", () => {
    const slow: PlaneState = { ...airborne, speed: 4, y: 50 };
    const r = stepPlane(slow, idle, 1 / 60, runwayWorld);
    expect(r.state.stalled).toBe(true);
    const after = run(slow, idle, 2);
    expect(after.s.y).toBeLessThan(50 - 2);
    expect(after.s.pitch).toBeLessThan(0);
    // No tumble: pitch stays within the dive limit, and speed comes back above the stall.
    expect(after.s.pitch).toBeGreaterThanOrEqual(PLANE_CONFIG.maxDivePitch - 1e-6);
    const later = run(after.s, idle, 6);
    expect(later.s.stalled).toBe(false);
    expect(later.s.speed).toBeGreaterThan(PLANE_CONFIG.stallSpeed);
  });
  it("is frame-rate independent", () => {
    const a = run(airborne, { ...climb, steer: 0.5 }, 4, runwayWorld, 1 / 30).s;
    const b = run(airborne, { ...climb, steer: 0.5 }, 4, runwayWorld, 1 / 120).s;
    expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(3);
    expect(Math.abs(a.heading - b.heading)).toBeLessThan(0.1);
  });
});

describe("plane physics: landing and the altitude floor", () => {
  it("cannot descend below the floor outside a landing zone", () => {
    const over: PlaneState = { ...createPlaneState(-40, 20, 0, Math.PI / 2), speed: 20, onGround: false };
    // 1.5 s at ≈ 20 u/s keeps it west of the strip (x < 0) the whole time.
    const r = run(over, dive, 1.5, (x) => (x < 0 ? { groundY: 0, canLand: false, floorY: 14 } : { groundY: 0, canLand: true, floorY: 0 }));
    expect(r.floorHit).toBe(true);
    expect(r.touchedDown).toBe(false);
    expect(r.s.y).toBeGreaterThanOrEqual(14 - 1e-6);
  });
  it("touches down on the runway, rolls out and brakes to a stop", () => {
    const approach: PlaneState = { ...createPlaneState(5, 6, 0, Math.PI / 2), speed: 18, onGround: false };
    const landing = run(approach, dive, 2.5);
    expect(landing.touchedDown).toBe(true);
    expect(landing.s.onGround).toBe(true);
    expect(landing.s.y).toBe(0);
    expect(landing.s.x).toBeLessThan(80);
    const stopped = run(landing.s, { ...idle, brake: true }, 3);
    expect(stopped.s.speed).toBe(0);
    expect(altitudeAbove(stopped.s, 0)).toBe(0);
  });
  it("nose vector is unit length and follows heading/pitch", () => {
    const [x, y, z] = noseVector(Math.PI / 2, 0.3);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    expect(x).toBeGreaterThan(0.9);
    expect(y).toBeCloseTo(Math.sin(0.3), 9);
    expect(Math.abs(z)).toBeLessThan(1e-9);
  });
});
