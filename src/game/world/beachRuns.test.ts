import { describe, expect, it } from "vitest";
import { beachLocal, beaches, insideBeach } from "@/data/beaches";
import { WATER_LEVEL } from "@/data/archipelago";
import { stepBoat, createBoatState } from "../vehicle/boatPhysics";
import { CAR_CONFIG, createCarState, stepCar, type Constrain } from "../vehicle/carPhysics";
import { BOAT_ENTER_DEPTH, BOAT_EXIT_DEPTH, shoreDecision, type ShoreDecision } from "../vehicle/transformer";
import { groundHeightAt, isShoreAt, sampleGround, seawardDirectionAt, seawardSpeedAt } from "./ground";
import { constrainCar } from "./obstacles";
import { constrainRampBodies } from "./rampColliders";
import { constrainBoat } from "./seaObstacles";

/** The vehicle's ground constraint, as `Vehicle.tsx` composes it. */
const constrainVehicle: Constrain = (x, z, step) => {
  const c = constrainCar(x, z, step);
  const r = constrainRampBodies(c.x, c.z, step?.prevX ?? c.x, step?.prevZ ?? c.z);
  return r.blocked ? { x: r.x, z: r.z, blocked: true } : c;
};

const FRACTIONS = [0.12, 0.5, 0.88];
const edgePoint = (b: (typeof beaches)[number], f: number, along: number): [number, number] => [
  b.edge.from[0] + (b.edge.to[0] - b.edge.from[0]) * f + b.seaward[0] * along,
  b.edge.from[1] + (b.edge.to[1] - b.edge.from[1]) * f + b.seaward[1] * along,
];

describe("V9 shore topography (no beach list involved)", () => {
  it("every beach reads as shore from just past its edge to the sea floor; the flat land, the ramps and the open sea do not", () => {
    for (const b of beaches) {
      for (const f of FRACTIONS) {
        expect(isShoreAt(...edgePoint(b, f, -2)), `${b.id} land`).toBe(false);
        for (const along of [1, 6, 12, 18, 23]) expect(isShoreAt(...edgePoint(b, f, along)), `${b.id} along ${along}`).toBe(true);
        expect(isShoreAt(...edgePoint(b, f, 40)), `${b.id} open sea`).toBe(false);
      }
    }
    expect(isShoreAt(0, 27)).toBe(false); // spawn
    expect(isShoreAt(-53, 45)).toBe(false); // on the West City Ramp's slope
    expect(isShoreAt(-150, 100)).toBe(false); // open sea
  });
  it("the downhill direction on every beach is its seaward direction (derived from the height field, not read from the data)", () => {
    for (const b of beaches) {
      for (const f of FRACTIONS) {
        for (const along of [3, 9, 15, 20]) {
          const d = seawardDirectionAt(...edgePoint(b, f, along))!;
          expect(d, `${b.id} along ${along}`).not.toBeNull();
          expect(d[0] * b.seaward[0] + d[1] * b.seaward[1]).toBeGreaterThan(0.97);
        }
      }
    }
    expect(seawardDirectionAt(0, 27)).toBeNull();
    expect(seawardSpeedAt(0, 27, 5, 5)).toBe(0);
  });
});

describe("V9 universal beaches: car → boat at several points of every beach", () => {
  for (const b of beaches) {
    for (const f of FRACTIONS) {
      it(`${b.id} at ${Math.round(f * 100)} % of its width: the car drives from the land into the water and the hull rule fires`, () => {
        const heading = Math.atan2(b.seaward[0], b.seaward[1]);
        const [sx, sz] = edgePoint(b, f, -8);
        let car = { ...createCarState(sx, sz, heading), speed: 6 };
        let decision: ShoreDecision = null;
        let fired: { x: number; z: number; depth: number; along: number } | null = null;
        let blocked = false;
        let maxSpeed = 0;
        for (let i = 0; i < 600 && !fired; i++) {
          const prev = car;
          car = stepCar(car, { throttle: 1, steer: 0, brake: false }, 1 / 60, CAR_CONFIG, constrainVehicle);
          if (car.speed < prev.speed - 1) blocked = true; // a bump
          maxSpeed = Math.max(maxSpeed, car.speed);
          const gs = sampleGround(car.x, car.z, car.heading);
          const vx = Math.sin(car.heading) * car.speed;
          const vz = Math.cos(car.heading) * car.speed;
          decision = shoreDecision({ state: "car", depth: gs.depth, seawardSpeed: gs.shore ? seawardSpeedAt(car.x, car.z, vx, vz) : 0, onShore: gs.shore, sinceLast: 10 });
          if (decision === "to-boat") fired = { x: car.x, z: car.z, depth: gs.depth, along: beachLocal(b, car.x, car.z).along };
        }
        expect(fired, "the hull rule fired").not.toBeNull();
        expect(blocked, "nothing invisible blocked the way down").toBe(false);
        expect(fired!.depth).toBeGreaterThanOrEqual(BOAT_ENTER_DEPTH);
        expect(fired!.depth).toBeLessThan(BOAT_ENTER_DEPTH + 0.4); // at the threshold, not far past it
        expect(insideBeach(b, fired!.x, fired!.z)).toBe(true);
        expect(fired!.along).toBeGreaterThan(5);
        expect(fired!.along).toBeLessThan(b.length);
        // The ground under the car was the sand slope the whole way: no step, no drop.
        expect(groundHeightAt(fired!.x, fired!.z)).toBeLessThan(0);
      });
    }
  }
});

describe("V9 universal beaches: boat → car at several points of every beach", () => {
  for (const b of beaches) {
    for (const f of FRACTIONS) {
      it(`${b.id} at ${Math.round(f * 100)} % of its width: the hull sails up the sand and the wheels-down rule fires before the hull grounds`, () => {
        const heading = Math.atan2(-b.seaward[0], -b.seaward[1]); // toward the land
        const [sx, sz] = edgePoint(b, f, b.length + 6); // in the run-out, afloat
        expect(WATER_LEVEL - groundHeightAt(sx, sz)).toBeGreaterThan(BOAT_ENTER_DEPTH);
        let boat = createBoatState(sx, sz, heading);
        let fired: { depth: number; along: number; stuck: boolean } | null = null;
        for (let i = 0; i < 900 && !fired; i++) {
          boat = stepBoat(boat, { throttle: 1, steer: 0, brake: false }, 1 / 60, undefined, constrainBoat);
          const gs = sampleGround(boat.x, boat.z, boat.heading);
          const d = shoreDecision({ state: "floating", depth: gs.depth, seawardSpeed: gs.shore ? seawardSpeedAt(boat.x, boat.z, boat.vx, boat.vz) : 0, onShore: gs.shore, sinceLast: 10 });
          if (d === "to-car") fired = { depth: gs.depth, along: beachLocal(b, boat.x, boat.z).along, stuck: boat.bump > 0 };
        }
        expect(fired, "the wheels-down rule fired").not.toBeNull();
        expect(fired!.depth).toBeLessThanOrEqual(BOAT_EXIT_DEPTH);
        expect(fired!.depth).toBeGreaterThan(0.1); // still afloat: the shore never pushed the hull back first
        expect(fired!.stuck).toBe(false);
        expect(fired!.along).toBeGreaterThan(0);
        expect(fired!.along).toBeLessThan(b.length);
      });
    }
  }
  it("a hull drifting sideways along the waterline (no landward speed) keeps its form on every beach", () => {
    for (const b of beaches) {
      const [x, z] = edgePoint(b, 0.5, 9.5); // between the two depths
      const gs = sampleGround(x, z, 0);
      expect(gs.depth).toBeGreaterThan(BOAT_EXIT_DEPTH - 0.1);
      const along: [number, number] = [-b.seaward[1], b.seaward[0]];
      expect(shoreDecision({ state: "floating", depth: gs.depth, seawardSpeed: seawardSpeedAt(x, z, along[0] * 4, along[1] * 4), onShore: gs.shore, sinceLast: 10 })).toBeNull();
      expect(shoreDecision({ state: "car", depth: gs.depth, seawardSpeed: seawardSpeedAt(x, z, along[0] * 4, along[1] * 4), onShore: gs.shore, sinceLast: 10 })).toBeNull();
    }
  });
});

describe("V9 hull against the coast: the helm keeps working on contact (SEA-01)", () => {
  const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  it("a hull pushed bow-first into the coast beside South Beach turns away under full helm and leaves the wall", () => {
    // Start just off the coast west of the bay, pointing into the land at a shallow angle, W held.
    let boat = createBoatState(2, 77.5, Math.PI - 0.6); // heading ≈ north-west into the coast
    for (let i = 0; i < 60 * 3; i++) boat = stepBoat(boat, { throttle: 1, steer: 0, brake: false }, 1 / 60, undefined, constrainBoat);
    expect(boat.bump).toBeGreaterThan(0); // pressed against the coast
    const pinnedAt: [number, number] = [boat.x, boat.z];
    // Full helm to starboard (away from the land, toward the open sea), throttle held: the bow must come round.
    let turned = false;
    for (let i = 0; i < 60 * 6 && !turned; i++) {
      boat = stepBoat(boat, { throttle: 1, steer: 1, brake: false }, 1 / 60, undefined, constrainBoat);
      if (Math.abs(wrapA(boat.heading - (Math.PI - 0.6))) > 1.2) turned = true;
    }
    expect(turned, `bow came round (heading ${boat.heading.toFixed(2)})`).toBe(true);
    // And the hull gets clear of the coast: 6 u from where it was pinned within a few seconds.
    let away = false;
    for (let i = 0; i < 60 * 6 && !away; i++) {
      boat = stepBoat(boat, { throttle: 1, steer: 0, brake: false }, 1 / 60, undefined, constrainBoat);
      if (Math.hypot(boat.x - pinnedAt[0], boat.z - pinnedAt[1]) > 6) away = true;
    }
    expect(away).toBe(true);
  });
  it("a hull scraping along the coast at a shallow angle keeps sliding instead of stopping", () => {
    let boat = createBoatState(-20, 76.0, Math.PI / 2 + 0.25); // mostly east, drifting into the south coast
    const x0 = boat.x;
    for (let i = 0; i < 60 * 4; i++) boat = stepBoat(boat, { throttle: 1, steer: 0, brake: false }, 1 / 60, undefined, constrainBoat);
    expect(boat.x - x0).toBeGreaterThan(10);
  });
});
