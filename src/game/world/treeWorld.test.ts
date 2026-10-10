import { describe, expect, it } from "vitest";
import { CAR_CONFIG, createCarState, stepCar, type CarState, type Constrain } from "../vehicle/carPhysics";
import { constrainCar } from "./obstacles";
import { TREE_CONFIG, TreeWorld, restAngle, type TreeConfig, type TreeEvent } from "./treeWorld";
import { treeDefs, type TreeDef } from "./trees";

const tree = (id: number, x: number, z: number, kind: TreeDef["kind"] = "round", scale = 1): TreeDef => ({ id, x, z, scale, rotation: 0, kind, tint: 0 });

/** Two trees 6 units apart on the z axis, plus a far one. The car drives north (heading π → -Z). */
const DEFS = [tree(0, 0, 0), tree(1, 0, -6, "pine"), tree(2, 30, 30, "tiered", 1.3)];
const FAST: TreeConfig = { ...TREE_CONFIG, fallenDuration: 2, respawnDuration: 0.5, shakeDuration: 0.5 };

function make(config: TreeConfig = FAST) {
  const world = new TreeWorld(DEFS, config);
  const constrain: Constrain = (x, z, step) => world.constrain(x, z, step);
  const events: TreeEvent[] = [];
  /** Drive with a fixed speed intent: the car starts at `speed` with the throttle held. */
  const drive = (start: CarState, seconds: number, dt: number, throttle = 1) => {
    let s = start;
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n; i++) {
      s = stepCar(s, { throttle, steer: 0, brake: false }, dt, CAR_CONFIG, constrain);
      world.update(dt, s.x, s.z);
      events.push(...world.takeEvents());
    }
    return s;
  };
  return { world, constrain, events, drive };
}

const north = (z: number, speed: number): CarState => ({ ...createCarState(0, z, Math.PI), speed });
/** Advance the simulation in 60 fps frames (the per-frame clamp ignores huge gaps on purpose). */
const advance = (world: TreeWorld, seconds: number, carX: number, carZ: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) world.update(1 / 60, carX, carZ);
};

describe("tree impacts from real driving", () => {
  it("soft hit: the trunk stays rigid, the tree shakes and the car bounces back", () => {
    const { world, events, drive } = make();
    const end = drive(north(2.0, 3), 0.4, 1 / 60, 0);
    const s = world.state(0);
    expect(events.map((e) => e.type)).toEqual(["shake"]);
    expect(["shaking", "standing"]).toContain(s.phase);
    expect(s.angle).toBe(0);
    expect(end.z).toBeGreaterThan(0 + 1.3); // never inside the trunk
    expect(end.speed).toBeLessThanOrEqual(0); // bumped back (or stopped)
    expect(world.isObstacle(0)).toBe(true);
    // Shaking is a decaying oscillation, then the tree is standing and rigid again.
    expect(Math.abs(world.tilt(s))).toBeLessThan(0.2);
    advance(world, 1, 0, 20);
    expect(world.state(0).phase).toBe("standing");
  });

  it("medium hit: the tree topples away from the car, the car slows but drives on through", () => {
    const { world, events, drive } = make();
    const end = drive(north(4, 8), 0.6, 1 / 60, 1);
    const s = world.state(0);
    expect(events[0]?.type).toBe("topple");
    expect(events[0]?.broken).toBe(false);
    expect(s.phase === "falling" || s.phase === "fallen").toBe(true);
    expect(s.broken).toBe(false);
    // Fall direction = travel direction (north = -Z).
    expect(s.dirZ).toBeLessThan(-0.95);
    expect(Math.abs(s.dirX)).toBeLessThan(0.3);
    expect(s.impact).toBeGreaterThanOrEqual(TREE_CONFIG.topple);
    expect(s.impact).toBeLessThan(TREE_CONFIG.break);
    // The car passed the trunk position and kept a positive speed.
    expect(end.z).toBeLessThan(-1.3);
    expect(end.speed).toBeGreaterThan(0);
    expect(world.isObstacle(0)).toBe(false);
  });

  it("the car loses speed on impact in proportion to the configured retention", () => {
    const { world, drive } = make();
    const before = 10;
    // One sub-step in contact: compare with the free-rolling speed.
    const free = stepCar(north(4, before), { throttle: 0, steer: 0, brake: false }, 1 / 60).speed;
    let s = north(1.8, before);
    s = stepCar(s, { throttle: 0, steer: 0, brake: false }, 1 / 60, CAR_CONFIG, (x, z, st) => world.constrain(x, z, st));
    expect(world.state(0).phase).toBe("falling");
    expect(s.speed).toBeCloseTo(free * TREE_CONFIG.retainTopple, 1);
    drive(s, 0.1, 1 / 60, 0);
  });

  it("strong hit: the trunk snaps and the car keeps more of its speed", () => {
    const { world, events, drive } = make();
    const end = drive(north(4, 18), 0.4, 1 / 60, 1);
    const s = world.state(0);
    expect(events[0]?.type).toBe("break");
    expect(s.broken).toBe(true);
    expect(s.impact).toBeGreaterThanOrEqual(TREE_CONFIG.break);
    expect(end.speed).toBeGreaterThan(5);
    expect(end.z).toBeLessThan(-2);
  });

  it("never emits a second impact for a tree that is already falling or fallen", () => {
    const { world, events, drive } = make();
    let s = drive(north(4, 8), 0.5, 1 / 60, 1);
    expect(events.filter((e) => e.id === 0 && (e.type === "topple" || e.type === "shake")).length).toBe(1);
    // Drive back over it several times while it falls and lies there.
    for (let k = 0; k < 4; k++) {
      s = { ...s, x: 0, z: k % 2 ? -4 : 4, heading: k % 2 ? 0 : Math.PI, speed: 12 };
      s = drive(s, 0.5, 1 / 60, 0);
    }
    expect(events.filter((e) => e.id === 0 && e.type !== "settle").length).toBe(1);
    expect(world.state(0).phase).toBe("fallen");
  });

  it("adjacent trees are untouched", () => {
    const { world, events, drive } = make();
    drive(north(4, 8), 0.3, 1 / 60, 1);
    expect(world.state(0).phase).toBe("falling");
    expect(world.state(1).phase).toBe("standing");
    expect(world.state(2).phase).toBe("standing");
    expect(new Set(events.map((e) => e.id))).toEqual(new Set([0]));
  });

  it("a tree hit while reversing falls behind the car", () => {
    const { world, drive } = make();
    // Facing north at z = -4, reversing (negative speed) into the tree at z = 0.
    const s: CarState = { ...createCarState(0, -4, Math.PI), speed: -7 };
    drive(s, 0.4, 1 / 60, -1);
    expect(world.state(0).phase === "falling" || world.state(0).phase === "fallen").toBe(true);
    expect(world.state(0).dirZ).toBeGreaterThan(0.95);
  });
});

describe("fall animation", () => {
  const topple = (dt: number, config = FAST, kind: TreeDef["kind"] = "round") => {
    const world = new TreeWorld([tree(0, 0, 0, kind)], config);
    world.constrain(0, 1.5, { prevX: 0, prevZ: 3, speed: 10, heading: Math.PI, dt: 1 / 60 });
    expect(world.state(0).phase).toBe("falling");
    const angles: number[] = [];
    let settled = -1;
    for (let i = 0; i < 400; i++) {
      world.update(dt, 0, 10); // car nearby: no respawn during the measurement
      angles.push(world.state(0).angle);
      if (settled < 0 && world.state(0).phase === "fallen") settled = (i + 1) * dt;
    }
    return { world, angles, settled };
  };

  it("pivots at the base with growing angular speed, bounces once and rests at the kind's rest angle", () => {
    const { world, angles, settled } = topple(1 / 60);
    const rest = restAngle("round");
    expect(settled).toBeGreaterThan(0.4);
    expect(settled).toBeLessThan(3);
    expect(world.state(0).angle).toBe(rest);
    // Monotonic acceleration before the first ground contact.
    const first = angles.findIndex((a) => a >= rest);
    for (let i = 2; i < first; i++) expect(angles[i]! - angles[i - 1]!).toBeGreaterThanOrEqual(angles[i - 1]! - angles[i - 2]! - 1e-6);
    // A small bounce: the angle dips below rest after the first contact, then settles.
    expect(Math.min(...angles.slice(first, first + 60))).toBeLessThan(rest);
    expect(world.state(0).bounces).toBeGreaterThanOrEqual(1);
    expect(Math.max(...angles)).toBeLessThanOrEqual(rest + 1e-9); // never through the ground
  });

  it("is identical at 30, 60 and 144 fps (fixed-step integration)", () => {
    const a = topple(1 / 30);
    const b = topple(1 / 60);
    const c = topple(1 / 144);
    expect(a.world.state(0).angle).toBe(b.world.state(0).angle);
    expect(b.world.state(0).angle).toBe(c.world.state(0).angle);
    expect(Math.abs(a.settled - b.settled)).toBeLessThan(1 / 30 + 1e-9);
    expect(Math.abs(b.settled - c.settled)).toBeLessThan(1 / 60 + 1e-9);
    expect(a.world.state(0).bounces).toBe(c.world.state(0).bounces);
  });

  it("reduced motion: a short linear tilt without bounce", () => {
    const world = new TreeWorld([tree(0, 0, 0)], FAST);
    world.reducedMotion = true;
    world.constrain(0, 1.5, { prevX: 0, prevZ: 3, speed: 16, heading: Math.PI, dt: 1 / 60 });
    let settled = 0;
    for (let i = 0; i < 100 && world.state(0).phase !== "fallen"; i++) {
      world.update(1 / 60, 0, 40);
      settled += 1 / 60;
    }
    expect(world.state(0).phase).toBe("fallen");
    expect(settled).toBeLessThan(0.45);
    expect(world.state(0).bounces).toBe(0);
  });

  it("a snapped trunk slides a little along the fall direction and stops", () => {
    const { world } = topple(1 / 60, { ...FAST, topple: 1, break: 2 });
    expect(world.state(0).broken).toBe(true);
    expect(world.state(0).slide).toBeGreaterThan(0.2);
    expect(world.state(0).slide).toBeLessThanOrEqual(0.5);
  });
});

describe("fallen state, restoration and limits", () => {
  const fell = (config = FAST) => {
    const { world, drive, events } = make(config);
    drive(north(4, 8), 0.3, 1 / 60, 1);
    while (world.state(0).phase === "falling") world.update(1 / 60, 0, -40);
    expect(world.state(0).phase).toBe("fallen");
    return { world, events, drive };
  };

  it("stays fallen for the configured time, then regrows only when the car is far away", () => {
    const { world, events } = fell();
    advance(world, FAST.fallenDuration + 1, 0, 3); // car parked next to it
    expect(world.state(0).phase).toBe("fallen");
    advance(world, 0.1, 0, FAST.respawnMinDistance - 1);
    expect(world.state(0).phase).toBe("fallen");
    world.update(1 / 60, 0, FAST.respawnMinDistance + 1);
    expect(world.state(0).phase).toBe("respawning");
    expect(world.growth(world.state(0))).toBeLessThan(1);
    advance(world, FAST.respawnDuration + 0.1, 0, 40);
    expect(world.state(0).phase).toBe("standing");
    expect(world.state(0).angle).toBe(0);
    expect(world.state(0).broken).toBe(false);
    expect(world.isObstacle(0)).toBe(true);
    expect(events.map((e) => e.type)).toEqual(["topple"]);
    expect(world.takeEvents().map((e) => e.type)).toEqual(["settle", "respawn", "restore"]);
  });

  it("manual reset regrows every damaged tree now, except the one under the car", () => {
    const { world, drive } = fell();
    // Knock the second tree down too and stop on top of the first one.
    const s = drive(north(-2, 9), 0.6, 1 / 60, 1);
    expect(world.state(1).phase === "falling" || world.state(1).phase === "fallen").toBe(true);
    void s;
    world.resetWorld(0, 0.5);
    expect(world.state(0).phase).toBe("fallen"); // car on top: deferred
    expect(world.state(0).forced).toBe(true);
    expect(world.state(1).phase).toBe("respawning"); // was falling: settled and regrowing
    world.update(0.05, 0, 0.5);
    expect(world.state(0).phase).toBe("fallen");
    world.update(0.05, 0, FAST.clearRadius + 0.5);
    expect(world.state(0).phase).toBe("respawning");
  });

  it("caps simultaneous animations: beyond maxDynamic a hit is a rigid bump", () => {
    const world = new TreeWorld([tree(0, 0, 0), tree(1, 10, 0)], { ...FAST, maxDynamic: 1 });
    expect(world.constrain(0, 1.5, { prevX: 0, prevZ: 3, speed: 10, heading: Math.PI, dt: 1 / 60 }).blocked).toBe(false);
    expect(world.state(0).phase).toBe("falling");
    const r = world.constrain(10, 1.5, { prevX: 10, prevZ: 3, speed: 10, heading: Math.PI, dt: 1 / 60 });
    expect(r.blocked).toBe(true);
    expect(world.state(1).phase).toBe("standing");
    expect(world.dynamicCount()).toBe(1);
  });

  it("caps fallen trees: past maxFallen the oldest regrows early (never near the car)", () => {
    const defs = [0, 1, 2].map((i) => tree(i, i * 10, 0));
    const world = new TreeWorld(defs, { ...FAST, maxFallen: 2, fallenDuration: 100 });
    for (const d of defs) {
      world.constrain(d.x, 1.5, { prevX: d.x, prevZ: 3, speed: 10, heading: Math.PI, dt: 1 / 60 });
      for (let i = 0; i < 300; i++) world.update(1 / 60, 100, 100);
    }
    expect(world.fallenCount()).toBe(2);
    expect(world.state(0).phase).not.toBe("fallen"); // the oldest regrew early
    expect(world.state(1).phase).toBe("fallen");
    expect(world.state(2).phase).toBe("fallen");
  });

  it("quality tiers hide a prefix of the list: hidden trees never collide, state persists", () => {
    const { world } = fell();
    world.activeCount = 1; // only tree 0 is rendered
    expect(world.isObstacle(1)).toBe(false);
    const r = world.constrain(0, -4.1, { prevX: 0, prevZ: -3, speed: 3, heading: Math.PI, dt: 1 / 60 });
    expect(r.blocked).toBe(false);
    expect(world.state(1).phase).toBe("standing");
    expect(world.state(0).phase).toBe("fallen");
    world.activeCount = 3;
    expect(world.state(0).phase).toBe("fallen");
    expect(world.isObstacle(1)).toBe(true);
  });

  it("releases nothing per impact: the simulation reuses its state objects and scratch arrays", () => {
    const { world, drive } = fell();
    const before = world.states.map((s) => s);
    world.resetWorld(0, 40);
    advance(world, FAST.respawnDuration + 0.1, 0, 40);
    drive(north(4, 8), 0.3, 1 / 60, 1);
    world.states.forEach((s, i) => expect(s).toBe(before[i]));
    expect(world.takeDirty()).toBeInstanceOf(Array);
  });
});

describe("world constraint", () => {
  it("buildings still block the car and trees are part of the same constraint", () => {
    // The Central Hub is a round obstacle at the origin.
    const r = constrainCar(0, 0, { prevX: 0, prevZ: 3, speed: 5, heading: Math.PI, dt: 1 / 60 });
    expect(r.blocked).toBe(true);
    expect(Math.hypot(r.x, r.z)).toBeGreaterThan(5);
    // Far from everything: untouched.
    const free = constrainCar(0, 27, { prevX: 0, prevZ: 27.1, speed: 5, heading: Math.PI, dt: 1 / 60 });
    expect(free).toEqual({ x: 0, z: 27, blocked: false, speed: undefined });
  });
  it("every real tree is reachable as a collider from free ground", () => {
    const defs = treeDefs();
    const world = new TreeWorld(defs);
    for (const d of defs.slice(0, 20)) {
      const r = world.constrain(d.x + 0.2, d.z, { prevX: d.x + 2, prevZ: d.z, speed: 2, heading: -Math.PI / 2, dt: 1 / 60 });
      expect(r.blocked).toBe(true);
      expect(Math.hypot(r.x - d.x, r.z - d.z)).toBeGreaterThanOrEqual(1.3 + 0.34 * d.scale + 0.1 - 1e-9);
    }
  });
});
