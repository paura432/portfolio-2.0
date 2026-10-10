import type { ConstrainResult, StepInfo } from "../vehicle/carPhysics";
import { TreeGrid, treeDefs, trunkRadius, type TreeDef } from "./trees";

/**
 * Destructible trees: a small, deterministic simulation that lives outside
 * React. The car's physics asks it to constrain each sub-step (so a standing
 * trunk is a rigid obstacle and a toppling one yields), the renderer asks it
 * which trees changed, and the HUD/particles drain its events.
 *
 * States: standing → shaking → standing (soft hit)
 *         standing → falling → fallen → respawning → standing (topple / break)
 * Transitions are driven by impacts and by a fixed-step clock, never by React.
 */
export type TreePhase = "standing" | "shaking" | "falling" | "fallen" | "respawning";

export interface TreeState {
  readonly id: number;
  phase: TreePhase;
  /** Seconds spent in the current phase. */
  t: number;
  /** Unit fall direction on XZ (away from the car at impact). */
  dirX: number;
  dirZ: number;
  /** Tilt from vertical, radians, around the fall axis. */
  angle: number;
  angularVel: number;
  /** Trunk snapped: stump stays, the upper part falls from the break point. */
  broken: boolean;
  /** Slide of the broken upper part along the fall direction (world units, unscaled). */
  slide: number;
  /** Approach speed that caused the current phase. */
  impact: number;
  /** Shake amplitude (radians) for the shaking phase. */
  shake: number;
  bounces: number;
  /** World clock when the tree settled (oldest-first respawn ordering). */
  fellAt: number;
  /** Manual reset asked for a respawn but the car was on top of it: respawn as soon as it is clear. */
  forced: boolean;
}

export interface TreeEvent {
  type: "shake" | "topple" | "break" | "settle" | "respawn" | "restore";
  id: number;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  impact: number;
  broken: boolean;
}

export interface TreeConfig {
  /** Approach speed (units/s) from which a trunk gives way and the tree falls. */
  topple: number;
  /** Approach speed from which the trunk snaps. */
  break: number;
  /** Fraction of speed the car keeps when ploughing through a toppling tree. */
  retainTopple: number;
  retainBreak: number;
  shakeDuration: number;
  /** Seconds a fallen tree stays down before it may regrow. */
  fallenDuration: number;
  respawnDuration: number;
  /** A tree never regrows closer than this to the car (no pop-in in front of the camera). */
  respawnMinDistance: number;
  /** Manual reset: trees closer than this regrow as soon as the car leaves. */
  clearRadius: number;
  /** Simultaneously animating trees (shaking, falling, respawning); the rest stay rigid. */
  maxDynamic: number;
  /** Fallen trees allowed before the oldest regrows early. */
  maxFallen: number;
  /** Angular acceleration gain (gravity on a pivoting trunk). */
  gravity: number;
  restitution: number;
  /** Fixed simulation step so the fall is identical at any frame rate. */
  step: number;
}

export const TREE_CONFIG: TreeConfig = {
  topple: 6,
  break: 13,
  retainTopple: 0.65,
  retainBreak: 0.7,
  shakeDuration: 0.9,
  fallenDuration: 25,
  respawnDuration: 1.1,
  respawnMinDistance: 28,
  clearRadius: 4.5,
  maxDynamic: 8,
  maxFallen: 24,
  gravity: 6.5,
  restitution: 0.28,
  step: 1 / 120,
};

export const CAR_RADIUS = 1.3;

/** Angle at which a fallen tree rests (canopy on the ground, trunk nearly flat). */
export function restAngle(kind: TreeDef["kind"]): number {
  return kind === "pine" ? 1.32 : kind === "round" ? 1.22 : 1.26;
}

function freshState(id: number): TreeState {
  return { id, phase: "standing", t: 0, dirX: 0, dirZ: 1, angle: 0, angularVel: 0, broken: false, slide: 0, impact: 0, shake: 0, bounces: 0, fellAt: 0, forced: false };
}

export class TreeWorld {
  readonly defs: readonly TreeDef[];
  readonly grid: TreeGrid;
  readonly states: TreeState[];
  /** Trees with id < activeCount are rendered and collide; the rest are hidden by the quality tier. */
  activeCount: number;
  /** `prefers-reduced-motion`: short linear tilt, no bounce. */
  reducedMotion = false;
  /** World clock, seconds. */
  time = 0;
  /** Capture tooling only: slows the fall so software renderers can film it. */
  timeScale = 1;
  private accumulator = 0;
  private readonly events: TreeEvent[] = [];
  private readonly dirty = new Set<number>();
  private readonly scratch: number[] = [];

  constructor(
    defs: readonly TreeDef[] = treeDefs(),
    readonly config: TreeConfig = TREE_CONFIG,
  ) {
    this.defs = defs;
    this.grid = new TreeGrid(defs);
    this.states = defs.map((d) => freshState(d.id));
    this.activeCount = defs.length;
  }

  state(id: number): TreeState {
    return this.states[id]!;
  }

  /** Ids that changed phase (or pose, while animating) since the last call. */
  takeDirty(out: number[] = []): number[] {
    out.length = 0;
    for (const id of this.dirty) out.push(id);
    this.dirty.clear();
    return out;
  }

  takeEvents(out: TreeEvent[] = []): TreeEvent[] {
    out.length = 0;
    for (const e of this.events) out.push(e);
    this.events.length = 0;
    return out;
  }

  dynamicCount(): number {
    let n = 0;
    for (const s of this.states) if (s.phase === "shaking" || s.phase === "falling" || s.phase === "respawning") n++;
    return n;
  }

  fallenCount(): number {
    let n = 0;
    for (const s of this.states) if (s.phase === "fallen") n++;
    return n;
  }

  isObstacle(id: number): boolean {
    const p = this.states[id]!.phase;
    return id < this.activeCount && (p === "standing" || p === "shaking");
  }

  private canAnimate(): boolean {
    return this.dynamicCount() < this.config.maxDynamic;
  }

  private emit(type: TreeEvent["type"], s: TreeState): void {
    const d = this.defs[s.id]!;
    this.events.push({ type, id: s.id, x: d.x, z: d.z, dirX: s.dirX, dirZ: s.dirZ, impact: s.impact, broken: s.broken });
    this.dirty.add(s.id);
  }

  /**
   * Car constraint for one physics sub-step. Standing trunks push the car out
   * (rigid bump); from `topple` approach speed the tree gives way instead, the
   * car keeps going with reduced speed and the tree starts falling away from it.
   */
  constrain(x: number, z: number, step?: StepInfo): ConstrainResult {
    const c = this.config;
    const near = this.grid.query(x, z, CAR_RADIUS + this.grid.maxRadius, this.scratch);
    let px = x;
    let pz = z;
    let blocked = false;
    let speed = step?.speed ?? 0;
    let yielded = false;
    const fx = step ? Math.sin(step.heading) : 0;
    const fz = step ? Math.cos(step.heading) : 1;
    for (const id of near) {
      if (!this.isObstacle(id)) continue;
      const d = this.defs[id]!;
      const s = this.states[id]!;
      const r = trunkRadius(d.scale) + CAR_RADIUS;
      const dx = d.x - px;
      const dz = d.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist >= r) continue;
      const nx = dist > 1e-6 ? dx / dist : fx;
      const nz = dist > 1e-6 ? dz / dist : fz;
      // Approach speed: velocity component toward the trunk (negative when moving away).
      const approach = speed * (fx * nx + fz * nz);
      if (approach >= c.topple && this.canAnimate()) {
        // Off-centre hits push the tree forward *and* sideways, away from the car's path.
        const rx = fz;
        const rz = -fx;
        const off = ((d.x - px) * rx + (d.z - pz) * rz) / r; // -1..1, 0 = dead centre
        const side = Math.abs(off) < 0.05 ? 0 : Math.max(-1, Math.min(1, off)) * 0.7;
        let ddx = nx + side * rx;
        let ddz = nz + side * rz;
        const dl = Math.hypot(ddx, ddz) || 1;
        ddx /= dl;
        ddz /= dl;
        this.topple(s, approach, ddx, ddz, approach >= c.break);
        speed *= s.broken ? c.retainBreak : c.retainTopple;
        yielded = true;
        continue;
      }
      px = d.x - nx * r;
      pz = d.z - nz * r;
      blocked = true;
      if (approach > 0.5) this.shake(s, approach);
    }
    return blocked ? { x: px, z: pz, blocked } : { x: px, z: pz, blocked, speed: yielded ? speed : undefined };
  }

  private shake(s: TreeState, impact: number): void {
    if (s.phase === "standing" && !this.canAnimate()) return;
    const amp = Math.min(0.14, 0.012 * impact + 0.02);
    if (s.phase === "standing") {
      s.phase = "shaking";
      s.t = 0;
      s.shake = amp;
      s.impact = impact;
      this.emit("shake", s);
    } else if (s.phase === "shaking" && amp > s.shake * 0.8 && s.t > 0.25) {
      s.shake = Math.max(s.shake, amp);
      s.t = 0;
      s.impact = impact;
      this.emit("shake", s);
    }
  }

  private topple(s: TreeState, impact: number, dirX: number, dirZ: number, broken: boolean): void {
    s.phase = "falling";
    s.t = 0;
    s.dirX = dirX;
    s.dirZ = dirZ;
    s.angle = 0;
    s.angularVel = (broken ? 0.9 : 0.45) + impact * 0.03;
    s.broken = broken;
    s.slide = 0;
    s.impact = impact;
    s.bounces = 0;
    s.shake = 0;
    this.emit(broken ? "break" : "topple", s);
  }

  /** Advance the simulation; `dt` is real frame time, integrated in fixed steps. */
  update(dt: number, carX: number, carZ: number): void {
    if (!(dt > 0)) return;
    dt *= this.timeScale;
    this.time += dt;
    this.accumulator += Math.min(dt, 0.25);
    const h = this.config.step;
    while (this.accumulator >= h) {
      this.stepAll(h, carX, carZ);
      this.accumulator -= h;
    }
  }

  private stepAll(h: number, carX: number, carZ: number): void {
    const c = this.config;
    let fallen = 0;
    let oldest: TreeState | null = null;
    for (const s of this.states) {
      switch (s.phase) {
        case "standing":
          continue;
        case "shaking":
          s.t += h;
          if (s.t >= c.shakeDuration) {
            s.phase = "standing";
            s.t = 0;
            s.shake = 0;
          }
          this.dirty.add(s.id);
          continue;
        case "falling":
          this.stepFall(s, h);
          this.dirty.add(s.id);
          continue;
        case "fallen":
          s.t += h;
          fallen++;
          if (!oldest || s.fellAt < oldest.fellAt) oldest = s;
          if (s.forced || s.t >= c.fallenDuration) this.tryRespawn(s, carX, carZ, s.forced ? c.clearRadius : c.respawnMinDistance);
          continue;
        case "respawning":
          s.t += h;
          if (s.t >= c.respawnDuration) {
            const id = s.id;
            Object.assign(s, freshState(id));
            this.emit("restore", s);
          } else this.dirty.add(s.id);
          continue;
      }
    }
    // Unlimited accumulation is not allowed: beyond the cap the oldest regrows early (still never near the car).
    if (fallen > c.maxFallen && oldest) this.tryRespawn(oldest, carX, carZ, c.respawnMinDistance);
  }

  private stepFall(s: TreeState, h: number): void {
    const c = this.config;
    const d = this.defs[s.id]!;
    const rest = restAngle(d.kind);
    s.t += h;
    if (this.reducedMotion) {
      s.angle = Math.min(rest, s.angle + (rest / 0.35) * h);
      if (s.angle >= rest) this.settle(s, rest);
      return;
    }
    // Pivoting trunk under gravity: torque grows with the tilt.
    s.angularVel += c.gravity * Math.sin(Math.max(0.08, s.angle)) * h;
    s.angle += s.angularVel * h;
    if (s.broken) s.slide = Math.min(0.5, s.slide + 0.45 * h);
    if (s.angle >= rest) {
      s.angle = rest;
      if (s.angularVel > 0.6 && s.bounces < 2) {
        s.angularVel = -s.angularVel * c.restitution;
        s.bounces++;
      } else this.settle(s, rest);
    }
    if (s.t > 6) this.settle(s, rest);
  }

  private settle(s: TreeState, rest: number): void {
    s.phase = "fallen";
    s.angle = rest;
    s.angularVel = 0;
    s.t = 0;
    s.fellAt = this.time;
    this.emit("settle", s);
  }

  private tryRespawn(s: TreeState, carX: number, carZ: number, minDistance: number): void {
    const d = this.defs[s.id]!;
    if (Math.hypot(d.x - carX, d.z - carZ) < minDistance) return;
    s.phase = "respawning";
    s.t = 0;
    s.forced = false;
    this.emit("respawn", s);
  }

  /**
   * Manual "reset world": every damaged tree regrows now, except those the car
   * is standing on, which regrow the moment the car drives off.
   */
  resetWorld(carX: number, carZ: number): void {
    for (const s of this.states) {
      if (s.phase === "standing" || s.phase === "respawning") continue;
      if (s.phase === "shaking") {
        Object.assign(s, freshState(s.id));
        this.dirty.add(s.id);
        continue;
      }
      if (s.phase === "falling") this.settle(s, restAngle(this.defs[s.id]!.kind));
      s.forced = true;
      this.tryRespawn(s, carX, carZ, this.config.clearRadius);
    }
  }

  /** Visual tilt for the current state (shaking is a damped oscillation along the impact direction). */
  tilt(s: TreeState): number {
    if (s.phase === "shaking") {
      const k = 1 - s.t / this.config.shakeDuration;
      return s.shake * Math.sin(s.t * 26) * k * k;
    }
    if (s.phase === "falling" || s.phase === "fallen") return s.angle;
    return 0;
  }

  /** 0 → 1 regrow progress (uniform scale) while respawning; 1 otherwise. */
  growth(s: TreeState): number {
    if (s.phase !== "respawning") return 1;
    const p = Math.min(1, s.t / this.config.respawnDuration);
    return p * p * (3 - 2 * p);
  }
}

/** The live simulation shared by physics, renderer and HUD (client singleton). */
export const treeWorld = new TreeWorld();
