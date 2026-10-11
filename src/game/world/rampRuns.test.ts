import { describe, expect, it } from "vitest";
import { rampLocal, rampPoint, ramps } from "@/data/ramps";
import { CAR_CONFIG, createCarState, stepCar, type Constrain } from "../vehicle/carPhysics";
import { rampStep } from "../vehicle/rampRun";
import { DEPLOY_SPEED, DURATION, launchPose, TAKEOFF_SPEED, type VehicleState } from "../vehicle/transformer";
import { groundHeightAt, isShoreAt, waterDepthAt } from "./ground";
import { CAR_RADIUS, clampToDriveArea, constrainCar, obstacles } from "./obstacles";
import { constrainRampBodies } from "./rampColliders";
import { resolveCollisions } from "../physics/collision";
import { landableAt, isSplashdown } from "../vehicle/landing";

const constrainVehicle: Constrain = (x, z, step) => {
  const c = constrainCar(x, z, step);
  const r = constrainRampBodies(c.x, c.z, step?.prevX ?? c.x, step?.prevZ ?? c.z);
  return r.blocked ? { x: r.x, z: r.z, blocked: true } : c;
};

describe("V9 flight ramps: every inventoried ramp", () => {
  it("there are exactly three launch ramps, each with a lip steep enough to launch (the only slopes in the world besides the beaches)", () => {
    expect(ramps.map((r) => r.id)).toEqual(["west-ramp", "campus-ramp", "skyport-ramp"]);
    for (const r of ramps) {
      expect(r.height).toBeGreaterThan(4);
      expect(r.length).toBeGreaterThanOrEqual(20);
      expect(isShoreAt(...rampPoint(r, r.length / 2, 0))).toBe(false);
    }
  });
  for (const r of ramps) {
    it(`${r.id}: the whole corridor is reachable by car and free of buildings, trees and furniture`, () => {
      for (let s = -r.approach; s <= r.length; s += 0.5) {
        for (const lat of [-r.width / 2 + CAR_RADIUS, 0, r.width / 2 - CAR_RADIUS]) {
          const [x, z] = rampPoint(r, s, lat);
          expect(clampToDriveArea(x, z, CAR_RADIUS).boundary, `${r.id} s=${s} lat=${lat} inside the drive area`).toBe(false);
          const hits = resolveCollisions({ x, z, r: CAR_RADIUS }, obstacles, Infinity).hits.filter((h) => !h.startsWith(r.id));
          expect(hits, `${r.id} s=${s} lat=${lat} buildings`).toEqual([]);
          // Trees and props: the vehicle constraint from a position just behind must not report a block.
          const c = constrainVehicle(x, z, { prevX: x - Math.sin(r.heading) * 0.3, prevZ: z - Math.cos(r.heading) * 0.3, speed: 1, heading: r.heading, dt: 1 / 60 });
          expect(c.blocked, `${r.id} s=${s} lat=${lat} trees / furniture`).toBe(false);
        }
      }
    });
    it(`${r.id}: driven from before its rule zone with W held and the helm on the centre line, the car prepares, deploys its wings and launches at the lip with takeoff speed, following the real slope`, () => {
      // Start 4 u before the rule zone (approach + lining-up lead), 2 u left of the centre line (the free lane beside
      // a building's padding, as on the Campus Ramp), steering to the centre with a 10 u lookahead like the E2E driver.
      const [ex, ez] = rampPoint(r, -r.approach - (r.deployLead ?? 0) - 4, -2);
      const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
      let car = createCarState(ex, ez, r.heading);
      let state: VehicleState = "car";
      let onRamp: (typeof ramps)[number]["id"] | null = null;
      let wings = 0;
      let clock = 0;
      const seen: VehicleState[] = ["car"];
      let launch: { speed: number; pitch: number; x: number; z: number; y: number } | null = null;
      let maxGround = 0;
      let blocked = false;
      for (let i = 0; i < 60 * 20 && !launch; i++) {
        const prev = car;
        const l = rampLocal(r, car.x, car.z);
        const [tx, tz] = rampPoint(r, l.s + 10, 0);
        const err = wrap(Math.atan2(tx - car.x, tz - car.z) - car.heading);
        car = stepCar(car, { throttle: 1, steer: Math.abs(err) < 0.08 ? 0 : err > 0 ? -1 : 1, brake: false }, 1 / 60, CAR_CONFIG, constrainVehicle);
        if (car.speed < prev.speed - 1) blocked = true;
        maxGround = Math.max(maxGround, groundHeightAt(car.x, car.z));
        if (state === "transforming-to-plane") {
          clock += 1 / 60;
          wings = Math.min(1, clock / DURATION["transforming-to-plane"]);
        }
        const rs = rampStep({ x: car.x, z: car.z, heading: car.heading, speed: car.speed, state, onRamp, wings, sinceLast: 10 });
        onRamp = rs.onRamp;
        const next: VehicleState | null = rs.decision === "prepare" ? "preparing-flight" : rs.decision === "deploy" ? "transforming-to-plane" : rs.decision === "clear" ? "car" : rs.decision === "abort" ? "transforming-to-car" : null;
        if (next && next !== state) {
          state = next;
          seen.push(next);
        }
        if (rs.decision === "launch") {
          const lp = launchPose(car.speed, rs.lipSlope);
          launch = { ...lp, x: car.x, z: car.z, y: groundHeightAt(prev.x, prev.z) };
        }
      }
      expect(blocked, `${r.id}: nothing blocked the run`).toBe(false);
      expect(seen, `${r.id}: states in order`).toEqual(["car", "preparing-flight", "transforming-to-plane"]);
      expect(launch, `${r.id}: launched at the lip`).not.toBeNull();
      expect(launch!.speed).toBeGreaterThanOrEqual(TAKEOFF_SPEED);
      expect(launch!.pitch).toBeGreaterThan(0.12);
      expect(maxGround).toBeGreaterThan(r.height * 0.9); // the car really climbed the slope
      expect(launch!.y).toBeGreaterThan(r.height * 0.85);
      expect(DEPLOY_SPEED).toBeLessThan(TAKEOFF_SPEED);
    });
    it(`${r.id}: what lies beyond the lip is water or landable ground, never a building or another slope`, () => {
      for (const d of [4, 10, 20, 35, 60, 90]) {
        const [x, z] = rampPoint(r, r.length + d, 0);
        const ok = isSplashdown(x, z) || landableAt(x, z) || clampToDriveArea(x, z, CAR_RADIUS).boundary; // off the drive area = over the skirt / sea
        expect(ok, `${r.id} ${d} u past the lip`).toBe(true);
        expect(resolveCollisions({ x, z, r: 2 }, obstacles, Infinity).hits.filter((h) => !h.startsWith(r.id)), `${r.id} ${d} u past the lip: buildings`).toEqual([]);
      }
      // A slow hop lands on the ground right past the lip, never in a hole.
      const [hx, hz] = rampPoint(r, r.length + 6, 0);
      expect(groundHeightAt(hx, hz)).toBeGreaterThanOrEqual(-0.01);
      expect(waterDepthAt(hx, hz)).toBeLessThan(0);
    });
  }
});
