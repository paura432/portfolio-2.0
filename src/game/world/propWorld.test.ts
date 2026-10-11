import { describe, expect, it } from "vitest";
import { stepCar, createCarState, CAR_CONFIG, type Constrain } from "../vehicle/carPhysics";
import { PROP_CATALOG } from "./propCatalog";
import { PROP_CONFIG, PropWorld, propDefs, type PropDef } from "./propWorld";

const lamp = (id: number, x: number, z: number): PropDef => ({ id, category: "lamp", x, z, rotation: 0, scale: 1, tint: 0 });
const bench = (id: number, x: number, z: number, rotation = 0): PropDef => ({ id, category: "bench", x, z, rotation, scale: 1, tint: 0 });
const planter = (id: number, x: number, z: number, rotation = 0): PropDef => ({ id, category: "planter", x, z, rotation, scale: 1, tint: 0 });

/**
 * Drive a car straight (+Z) at the props from `start` at a steady `speed`
 * (a capped throttle holds it) until it passes `untilZ`, bounces back or stalls.
 */
function drive(world: PropWorld, start: [number, number], speed: number, untilZ: number, maxSteps = 600) {
  const constrain: Constrain = (x, z, step) => world.constrain(x, z, step);
  const config = { ...CAR_CONFIG, maxSpeed: speed };
  let s = { ...createCarState(start[0], start[1], 0), speed };
  const path: { x: number; z: number; speed: number }[] = [];
  for (let i = 0; i < maxSteps && s.z < untilZ; i++) {
    s = stepCar(s, { throttle: 1, steer: 0, brake: false }, 1 / 60, config, constrain);
    world.update(1 / 60, s.x, s.z);
    path.push({ x: s.x, z: s.z, speed: s.speed });
    if (s.speed < 0) break; // bounced off something rigid
  }
  return { car: s, path };
}

describe("propDefs (V9 inventory)", () => {
  it("lists every lamp, planter, bench, bollard and bush with a stable id and is deterministic", () => {
    const defs = propDefs();
    const count = (c: string) => defs.filter((d) => d.category === c).length;
    expect(count("lamp")).toBe(75);
    expect(count("planter")).toBe(4);
    expect(count("bench")).toBe(27);
    expect(count("bollard")).toBe(16);
    expect(count("bush")).toBe(110);
    defs.forEach((d, i) => expect(d.id).toBe(i));
    expect(propDefs()).toBe(defs);
  });
});

describe("prop world: lamp", () => {
  it("a slow nudge wobbles the post and bumps the car back; the post stays solid", () => {
    const w = new PropWorld([lamp(0, 0, 10)]);
    const { car } = drive(w, [0, 7.5], 2.5, 12);
    expect(w.state(0).phase).toBe("wobbling");
    expect(w.isObstacle(0)).toBe(true);
    expect(car.z + 1.3).toBeLessThanOrEqual(10 - 0.24 + 1e-6);
    expect(car.speed).toBeLessThanOrEqual(0); // bounced
    for (let i = 0; i < 120; i++) w.update(1 / 60, 0, 0);
    expect(w.state(0).phase).toBe("standing");
    expect(w.tilt(w.state(0))).toBe(0);
  });
  it("a fast hit knocks the lamp over away from the car, the car keeps most of its speed and passes", () => {
    const w = new PropWorld([lamp(0, 0, 10)]);
    const events = [];
    const { car, path } = drive(w, [0, 4], 14, 16);
    events.push(...w.takeEvents());
    expect(events.map((e) => e.type)).toContain("knock");
    const s = w.state(0);
    expect(["falling", "down"]).toContain(s.phase);
    expect(s.dirZ).toBeGreaterThan(0.9); // away from the car
    expect(w.isObstacle(0)).toBe(false);
    expect(car.z).toBeGreaterThan(12);
    const atHit = path.find((p) => p.z > 8.5)!;
    expect(atHit.speed).toBeGreaterThan(14 * PROP_CATALOG.lamp.reaction.retain - 1);
    // The fall is an animation that ends flat on the ground.
    for (let i = 0; i < 600 && w.state(0).phase !== "down"; i++) w.update(1 / 60, 0, 0);
    expect(w.state(0).phase).toBe("down");
    expect(w.state(0).angle).toBeCloseTo(PROP_CATALOG.lamp.reaction.restAngle, 5);
    expect(w.downCount()).toBe(1);
  });
  it("a knocked lamp is restored after its down time once the car is far, never while it is near", () => {
    const w = new PropWorld([lamp(0, 0, 10)]);
    drive(w, [0, 4], 14, 16);
    for (let i = 0; i < 60 * 40; i++) w.update(1 / 60, 0, 11); // car parked on it
    expect(w.state(0).phase).toBe("down");
    for (let i = 0; i < 60 * 3; i++) w.update(1 / 60, 60, 60);
    expect(w.state(0).phase).toBe("standing");
    expect(w.isObstacle(0)).toBe(true);
    expect(w.takeEvents().map((e) => e.type)).toContain("restore");
  });
  it("reset world restores a down lamp at once (when the car is clear) and clears a wobble", () => {
    const w = new PropWorld([lamp(0, 0, 10), lamp(1, 20, 10)]);
    drive(w, [0, 4], 14, 16);
    drive(w, [20, 7.5], 2.5, 12);
    expect(w.state(0).phase).not.toBe("standing");
    expect(w.state(1).phase).toBe("wobbling");
    w.resetWorld(50, 50);
    expect(w.state(1).phase).toBe("standing");
    for (let i = 0; i < 90; i++) w.update(1 / 60, 50, 50);
    expect(w.state(0).phase).toBe("standing");
  });
});

describe("prop world: planter (heavy, oriented box)", () => {
  it("a medium hit shoves the planter along the push; it stays solid and its collider moves with it", () => {
    const w = new PropWorld([planter(0, 0, 10, 0.3)]);
    const { car } = drive(w, [0, 5], 5, 12);
    const s = w.state(0);
    expect(["shoved", "standing"]).toContain(s.phase);
    expect(w.takeEvents().map((e) => e.type)).toContain("shove");
    for (let i = 0; i < 120; i++) w.update(1 / 60, 0, 0);
    const p = w.positionOf(0);
    expect(p.z).toBeGreaterThan(10.05);
    expect(p.z - 10).toBeLessThanOrEqual(PROP_CATALOG.planter.reaction.maxSlide + 1e-6);
    expect(w.isObstacle(0)).toBe(true);
    expect(w.obstacleOf(0)).toMatchObject({ kind: "obb", z: p.z, rotation: 0.3 });
    expect(car.z).toBeLessThan(p.z); // never through it
  });
  it("repeated shoves never move it further than maxSlide from its place", () => {
    const w = new PropWorld([planter(0, 0, 10)]);
    for (let k = 0; k < 8; k++) {
      const p = w.positionOf(0);
      drive(w, [0, p.z - 5], 5, p.z + 2);
      for (let i = 0; i < 90; i++) w.update(1 / 60, 0, 0);
    }
    const p = w.positionOf(0);
    expect(Math.hypot(p.x, p.z - 10)).toBeLessThanOrEqual(PROP_CATALOG.planter.reaction.maxSlide + 1e-6);
  });
  it("a hard hit tips it over and the car ploughs through, slowed", () => {
    const w = new PropWorld([planter(0, 0, 10)]);
    const { car, path } = drive(w, [0, 2], 18, 16);
    expect(["falling", "down"]).toContain(w.state(0).phase);
    expect(car.z).toBeGreaterThan(12);
    const after = path.find((p) => p.z > 10.5)!;
    expect(after.speed).toBeLessThan(18 * 0.75);
    expect(after.speed).toBeGreaterThan(18 * PROP_CATALOG.planter.reaction.retain - 1);
  });
});

describe("prop world: bench (light, oriented box)", () => {
  it("collides along its drawn orientation: the car passes beside a bench turned along the road", () => {
    // Bench along the Z axis (rotation π/2): half length 0.85 along Z, half depth 0.3 along X.
    const w = new PropWorld([bench(0, 2.0, 10, Math.PI / 2)]);
    const { car } = drive(w, [0, 4], 8, 14);
    expect(car.z).toBeGreaterThan(13.5); // clear: the bench's short side is 2 − 0.3 = 1.7 > 1.3 away
    expect(w.state(0).phase).toBe("standing");
    const w2 = new PropWorld([bench(0, 1.2, 10, Math.PI / 2)]);
    const r = drive(w2, [0, 4], 1.5, 14);
    expect(w2.state(0).phase).not.toBe("standing"); // touched
    expect(r.car.z).toBeLessThan(10.5);
  });
  it("a fast car flips the bench and keeps going; the bench lies down and is no obstacle", () => {
    const w = new PropWorld([bench(0, 0, 10)]);
    const { car } = drive(w, [0, 3], 12, 15);
    expect(["falling", "down"]).toContain(w.state(0).phase);
    expect(w.isObstacle(0)).toBe(false);
    expect(car.z).toBeGreaterThan(12);
    for (let i = 0; i < 600 && w.state(0).phase !== "down"; i++) w.update(1 / 60, 0, 0);
    expect(w.state(0).phase).toBe("down");
    // Drive back over it: nothing blocks.
    const back = drive(w, [0, 6], 6, 14);
    expect(back.car.z).toBeGreaterThan(13.5);
  });
});

describe("prop world: limits and determinism", () => {
  it("never animates more than maxDynamic props at once; the rest stay rigid", () => {
    const defs = Array.from({ length: PROP_CONFIG.maxDynamic + 5 }, (_, i) => lamp(i, i * 3, 10));
    const w = new PropWorld(defs);
    for (const d of defs) drive(w, [d.x, 7.5], 2.5, 12);
    expect(w.dynamicCount()).toBeLessThanOrEqual(PROP_CONFIG.maxDynamic);
    expect(defs.filter((d) => w.isObstacle(d.id)).length).toBe(defs.length);
  });
  it("is frame-rate independent: the same hit at 30 and 120 fps ends in the same rest pose", () => {
    const run = (fps: number) => {
      const w = new PropWorld([lamp(0, 0, 10)]);
      let s = { ...createCarState(0, 4, 0), speed: 14 };
      for (let i = 0; i < 2 * fps && s.z < 16; i++) s = stepCar(s, { throttle: 0, steer: 0, brake: false }, 1 / fps, CAR_CONFIG, (x, z, step) => w.constrain(x, z, step));
      for (let i = 0; i < 8 * fps; i++) w.update(1 / fps, 0, 0);
      return w.state(0);
    };
    const a = run(30);
    const b = run(120);
    expect(a.phase).toBe("down");
    expect(b.phase).toBe("down");
    expect(a.angle).toBeCloseTo(b.angle, 6);
    expect(a.dirZ).toBeCloseTo(b.dirZ, 2);
  });
  it("categories outside the active set are neither obstacles nor destructible yet", () => {
    const w = new PropWorld([{ id: 0, category: "bollard", x: 0, z: 10, rotation: 0, scale: 1, tint: 0 }], PROP_CONFIG, ["lamp"]);
    expect(w.isObstacle(0)).toBe(false);
    const { car } = drive(w, [0, 4], 8, 14);
    expect(car.z).toBeGreaterThan(13.5);
  });
});

describe("prop world: iteration 4 categories", () => {
  const def = (category: "bollard" | "bush" | "signpost" | "mast", scale = 1): PropDef => ({ id: 0, category, x: 0, z: 10, rotation: 0, scale, tint: 0 });
  it("the full list now carries the fixtures: 9 signposts / sign posts and 10 masts, all active", () => {
    const defs = propDefs();
    expect(defs.filter((d) => d.category === "signpost").length).toBe(9);
    expect(defs.filter((d) => d.category === "mast").length).toBe(10);
    expect(defs.length).toBe(75 + 4 + 27 + 16 + 110 + 9 + 10);
    expect(new PropWorld(defs).active.size).toBe(7);
    for (const key of ["plaza:west", "ramp:west-ramp:mast:l", "ramp:campus-ramp:sign", "skyport:pad:3", "skyport:hangar-sign", "harbor:gate-sign"]) expect(defs.find((d) => d.key === key), key).toBeDefined();
  });
  it("bollard: a nudge wobbles it and holds the car; a hit ≥ 4 u/s knocks it flat and the car passes", () => {
    const w = new PropWorld([def("bollard")]);
    expect(drive(w, [0, 8], 2, 12).car.z + 1.3).toBeLessThanOrEqual(10 - 0.16 + 1e-6);
    expect(w.state(0).phase).toBe("wobbling");
    const w2 = new PropWorld([def("bollard")]);
    const { car } = drive(w2, [0, 5], 8, 14);
    expect(["falling", "down"]).toContain(w2.state(0).phase);
    expect(car.z).toBeGreaterThan(12);
  });
  it("bush: any forward motion into it flattens it (a car pressed against it at rest is never held), the car keeps moving and it stops colliding", () => {
    // Pressed against the bush at rest, throttle held: it gives way within a second.
    const w = new PropWorld([def("bush", 0.9)]);
    const pressed = drive(w, [0, 10 - 1.3 - 0.54 + 0.05], 0.5, 12, 120); // creeping at 0.5 u/s against it
    expect(w.state(0).phase).toBe("down");
    expect(pressed.car.z).toBeGreaterThan(9);
    const w2 = new PropWorld([def("bush", 0.9)]);
    const { car, path } = drive(w2, [0, 6], 6, 14);
    expect(w2.state(0).phase).toBe("down");
    expect(w2.state(0).squash).toBeLessThan(0.3);
    expect(w2.isObstacle(0)).toBe(false);
    expect(car.z).toBeGreaterThan(13);
    expect(path.find((p) => p.z > 10.5)!.speed).toBeGreaterThan(6 * 0.8);
    expect(w2.takeEvents().map((e) => e.type)).toContain("flatten");
  });
  it("signpost: heavy post, needs ≥ 8 u/s to fall; mast ≥ 7; both hold a slow car", () => {
    for (const [c, speed] of [["signpost", 8], ["mast", 7]] as const) {
      const slow = new PropWorld([def(c)]);
      drive(slow, [0, 7], speed - 2, 12);
      expect(slow.state(0).phase, `${c} slow`).toBe("wobbling");
      expect(slow.isObstacle(0)).toBe(true);
      const fast = new PropWorld([def(c)]);
      const { car } = drive(fast, [0, 4], speed + 3, 14);
      expect(["falling", "down"], `${c} fast`).toContain(fast.state(0).phase);
      expect(car.z).toBeGreaterThan(12);
    }
  });
});
