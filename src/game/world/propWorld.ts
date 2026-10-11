import type { ConstrainResult, StepInfo } from "../vehicle/carPhysics";
import { resolveCircleObstacle, type Obstacle } from "../physics/collision";
import { ACTIVE_CATEGORIES, PROP_CATALOG, propObstacle, type PropCategory } from "./propCatalog";
import { generateFurniture, generateLamps } from "./props";
import { treeDefs } from "./trees";

/**
 * Destructible street furniture (V9): a deterministic simulation outside
 * React, the same architecture as the V4 trees generalised to categories.
 * The car's physics asks it to constrain each sub-step (a standing prop is a
 * rigid obstacle; one hit hard enough yields and is knocked down), the
 * renderer asks which props changed, the HUD and particles drain its events.
 *
 * States: standing → wobbling → standing            (soft contact)
 *         standing → shoved (slides, stays solid) → standing   (medium hit, heavy props)
 *         standing → falling → down → restoring → standing     (hard hit)
 *         standing → down (flattened) → restoring → standing   (bushes)
 */
export type PropPhase = "standing" | "wobbling" | "shoved" | "falling" | "down" | "restoring";

export interface PropDef {
  /** Stable identity: index in the full deterministic list (never changes with quality tiers). */
  id: number;
  category: PropCategory;
  x: number;
  z: number;
  rotation: number;
  scale: number;
  /** Renderer hint (bush tint index). */
  tint: number;
}

export interface PropState {
  readonly id: number;
  phase: PropPhase;
  /** Seconds in the current phase. */
  t: number;
  /** Unit direction of the push / fall on XZ. */
  dirX: number;
  dirZ: number;
  /** Tilt from vertical (radians) around the fall axis. */
  angle: number;
  angularVel: number;
  /** Slide along `dir` (world units) and its remaining velocity. */
  slide: number;
  slideVel: number;
  /** Accumulated displacement from earlier shoves (world units); the prop's place is def + offset + dir · slide. */
  offX: number;
  offZ: number;
  /** Vertical squash (1 intact, < 1 flattened). */
  squash: number;
  /** Wobble amplitude (radians). */
  wobble: number;
  impact: number;
  bounces: number;
  /** World clock when the prop went down (oldest-first restore). */
  downAt: number;
  /** Reset asked for a restore while the car was on top: restore as soon as it is clear. */
  forced: boolean;
}

export type PropEventType = "wobble" | "shove" | "knock" | "flatten" | "settle" | "restore";

export interface PropEvent {
  type: PropEventType;
  id: number;
  category: PropCategory;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  impact: number;
}

export interface PropWorldConfig {
  wobbleDuration: number;
  restoreDuration: number;
  /** A prop never comes back closer than this to the car. */
  restoreMinDistance: number;
  /** Manual reset: props closer than this are restored as soon as the car leaves. */
  clearRadius: number;
  /** Props animating at once (wobbling, shoved, falling, restoring); the rest stay rigid. */
  maxDynamic: number;
  /** Props allowed down before the oldest is restored early. */
  maxDown: number;
  restitution: number;
  /** Deceleration of a shoved prop (u/s²). */
  slideDrag: number;
  /** Fixed simulation step. */
  step: number;
}

export const PROP_CONFIG: PropWorldConfig = {
  wobbleDuration: 0.8,
  restoreDuration: 0.9,
  restoreMinDistance: 26,
  clearRadius: 3.5,
  maxDynamic: 10,
  maxDown: 40,
  restitution: 0.25,
  slideDrag: 6,
  step: 1 / 120,
};

export const CAR_RADIUS = 1.3;

/**
 * The full deterministic prop list with stable ids, in catalogue order:
 * lamps, planters, benches, then the categories that join the simulation in
 * later iterations (bollards, bushes). Positions come from the V3 placers, so
 * the destructible props stand exactly where the static ones always stood.
 */
let cache: PropDef[] | null = null;
export function propDefs(): PropDef[] {
  if (cache) return cache;
  const furniture = generateFurniture(treeDefs());
  const lamps = generateLamps();
  const defs: PropDef[] = [];
  const push = (category: PropCategory, items: { x: number; z: number; rotation: number; scale?: number; tint?: number }[]) => {
    for (const p of items) defs.push({ id: defs.length, category, x: p.x, z: p.z, rotation: p.rotation, scale: p.scale ?? 1, tint: p.tint ?? 0 });
  };
  push("lamp", lamps);
  push("planter", furniture.planters);
  push("bench", furniture.benches);
  push("bollard", furniture.bollards);
  push("bush", furniture.bushes);
  cache = defs;
  return defs;
}

function freshState(id: number): PropState {
  return { id, phase: "standing", t: 0, dirX: 0, dirZ: 1, angle: 0, angularVel: 0, slide: 0, slideVel: 0, offX: 0, offZ: 0, squash: 1, wobble: 0, impact: 0, bounces: 0, downAt: 0, forced: false };
}

/** Uniform grid over XZ for "props near this point" queries. */
class PropGrid {
  private readonly cells = new Map<number, number[]>();
  readonly maxRadius: number;
  constructor(
    readonly defs: readonly PropDef[],
    readonly cellSize = 8,
  ) {
    let maxR = 0;
    for (const d of defs) {
      const key = this.key(this.cell(d.x), this.cell(d.z));
      const list = this.cells.get(key);
      if (list) list.push(d.id);
      else this.cells.set(key, [d.id]);
      const c = PROP_CATALOG[d.category].collider;
      maxR = Math.max(maxR, (c.kind === "circle" ? c.r : Math.hypot(c.hx, c.hz)) * d.scale + PROP_CATALOG[d.category].reaction.maxSlide);
    }
    this.maxRadius = maxR;
  }
  private cell(v: number): number {
    return Math.floor(v / this.cellSize);
  }
  private key(cx: number, cz: number): number {
    return (cx + 512) * 1024 + (cz + 512);
  }
  query(x: number, z: number, radius: number, out: number[] = []): number[] {
    out.length = 0;
    const minX = this.cell(x - radius);
    const maxX = this.cell(x + radius);
    const minZ = this.cell(z - radius);
    const maxZ = this.cell(z + radius);
    const r2 = radius * radius;
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const list = this.cells.get(this.key(cx, cz));
        if (!list) continue;
        for (const id of list) {
          const d = this.defs[id]!;
          const dx = d.x - x;
          const dz = d.z - z;
          if (dx * dx + dz * dz <= r2) out.push(id);
        }
      }
    }
    return out;
  }
}

export class PropWorld {
  readonly defs: readonly PropDef[];
  readonly states: PropState[];
  readonly active: ReadonlySet<PropCategory>;
  /** `prefers-reduced-motion`: short linear tilt, no bounce. */
  reducedMotion = false;
  time = 0;
  /** Capture tooling only. */
  timeScale = 1;
  private readonly grid: PropGrid;
  private accumulator = 0;
  private readonly events: PropEvent[] = [];
  private readonly dirty = new Set<number>();
  private readonly scratch: number[] = [];
  private readonly obstacle: Obstacle;

  constructor(
    defs: readonly PropDef[] = propDefs(),
    readonly config: PropWorldConfig = PROP_CONFIG,
    active: readonly PropCategory[] = ACTIVE_CATEGORIES,
  ) {
    this.defs = defs;
    this.states = defs.map((d) => freshState(d.id));
    this.active = new Set(active);
    this.grid = new PropGrid(defs);
    this.obstacle = { kind: "round", id: "", x: 0, z: 0, r: 0 };
  }

  state(id: number): PropState {
    return this.states[id]!;
  }

  /** The prop is simulated (its category is wired in) and currently solid. */
  isObstacle(id: number): boolean {
    const d = this.defs[id]!;
    if (!this.active.has(d.category)) return false;
    const p = this.states[id]!.phase;
    return p === "standing" || p === "wobbling" || p === "shoved";
  }

  /** Where the prop stands right now (its shoves included). */
  positionOf(id: number): { x: number; z: number } {
    const d = this.defs[id]!;
    const s = this.states[id]!;
    return { x: d.x + s.offX + s.dirX * s.slide, z: d.z + s.offZ + s.dirZ * s.slide };
  }

  /** The world-space collider of a solid prop right now (its shoved position included). */
  obstacleOf(id: number): Obstacle {
    const d = this.defs[id]!;
    const p = this.positionOf(id);
    return propObstacle(`prop:${d.category}:${id}`, d.category, p.x, p.z, d.rotation, d.scale);
  }

  takeDirty(out: number[] = []): number[] {
    out.length = 0;
    for (const id of this.dirty) out.push(id);
    this.dirty.clear();
    return out;
  }

  takeEvents(out: PropEvent[] = []): PropEvent[] {
    out.length = 0;
    for (const e of this.events) out.push(e);
    this.events.length = 0;
    return out;
  }

  dynamicCount(): number {
    let n = 0;
    for (const s of this.states) if (s.phase === "wobbling" || s.phase === "shoved" || s.phase === "falling" || s.phase === "restoring") n++;
    return n;
  }

  downCount(): number {
    let n = 0;
    for (const s of this.states) if (s.phase === "down" || s.phase === "falling") n++;
    return n;
  }

  private canAnimate(): boolean {
    return this.dynamicCount() < this.config.maxDynamic;
  }

  private emit(type: PropEventType, s: PropState): void {
    const d = this.defs[s.id]!;
    const p = this.positionOf(s.id);
    this.events.push({ type, id: s.id, category: d.category, x: p.x, z: p.z, dirX: s.dirX, dirZ: s.dirZ, impact: s.impact });
    this.dirty.add(s.id);
  }

  /**
   * Car constraint for one physics sub-step. Solid props push the car out;
   * from the category's `knock` approach speed the prop gives way instead (the
   * car keeps most of its speed and the prop goes down away from it); between
   * `shove` and `knock` a heavy prop slides along the push and stays solid.
   */
  constrain(x: number, z: number, step?: StepInfo): ConstrainResult {
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
      const r = PROP_CATALOG[d.category].reaction;
      const o = this.obstacleOf(id);
      const out = resolveCircleObstacle({ x: px, z: pz, r: CAR_RADIUS }, o);
      if (!out) continue;
      // Push direction (from the car toward the prop) and the approach speed along it.
      const { x: ox, z: oz } = this.positionOf(id);
      let nx = ox - px;
      let nz = oz - pz;
      const dist = Math.hypot(nx, nz);
      if (dist > 1e-6) {
        nx /= dist;
        nz /= dist;
      } else {
        nx = fx;
        nz = fz;
      }
      const approach = speed * (fx * nx + fz * nz);
      if (approach >= r.knock && this.canAnimate()) {
        // Off-centre hits send the prop forward and sideways, away from the car's path.
        const rx = fz;
        const rz = -fx;
        const off = ((ox - px) * rx + (oz - pz) * rz) / Math.max(0.3, dist);
        const side = Math.abs(off) < 0.05 ? 0 : Math.max(-1, Math.min(1, off)) * 0.6;
        let ddx = fx + side * rx;
        let ddz = fz + side * rz;
        const dl = Math.hypot(ddx, ddz) || 1;
        ddx /= dl;
        ddz /= dl;
        this.knock(s, approach, ddx, ddz);
        speed *= r.retain;
        yielded = true;
        continue;
      }
      px = out.x;
      pz = out.z;
      blocked = true;
      if (approach >= r.shove && this.canAnimate()) this.shove(s, approach, fx, fz);
      else if (approach >= r.wobble) this.wobble(s, approach, fx, fz);
    }
    return blocked ? { x: px, z: pz, blocked } : { x: px, z: pz, blocked, speed: yielded ? speed : undefined };
  }

  private wobble(s: PropState, impact: number, dirX: number, dirZ: number): void {
    if (s.phase === "standing" && !this.canAnimate()) return;
    if (s.phase === "shoved") return;
    const amp = Math.min(0.12, 0.012 * impact + 0.02);
    if (s.phase === "standing") {
      s.phase = "wobbling";
      s.t = 0;
      s.wobble = amp;
      s.dirX = dirX;
      s.dirZ = dirZ;
      s.impact = impact;
      this.emit("wobble", s);
    } else if (s.phase === "wobbling" && amp > s.wobble * 0.8 && s.t > 0.25) {
      s.wobble = Math.max(s.wobble, amp);
      s.t = 0;
      s.impact = impact;
      this.emit("wobble", s);
    }
  }

  private shove(s: PropState, impact: number, dirX: number, dirZ: number): void {
    const d = this.defs[s.id]!;
    const r = PROP_CATALOG[d.category].reaction;
    if (s.phase === "shoved" && s.t < 0.2) return;
    // A prop never travels further than `maxSlide` from where it was placed: wedged, it only wobbles.
    const total = Math.hypot(s.offX + s.dirX * s.slide + dirX * 0.3, s.offZ + s.dirZ * s.slide + dirZ * 0.3);
    if (total >= r.maxSlide) {
      this.wobble(s, impact, dirX, dirZ);
      return;
    }
    // A shoved prop keeps one push direction so its collider and mesh move together; a new push from
    // another side starts over from the current (slid) place by folding the slide into the offset.
    if (s.slide !== 0 && (Math.abs(dirX - s.dirX) > 1e-3 || Math.abs(dirZ - s.dirZ) > 1e-3)) {
      s.offX += s.dirX * s.slide;
      s.offZ += s.dirZ * s.slide;
      s.slide = 0;
    }
    s.phase = "shoved";
    s.t = 0;
    s.dirX = dirX;
    s.dirZ = dirZ;
    // Slide distance grows with the hit; the drag brings it to rest over that distance.
    const distance = Math.min(r.maxSlide - total, impact * r.slidePerSpeed);
    s.slideVel = Math.sqrt(2 * this.config.slideDrag * Math.max(0, distance));
    s.wobble = Math.min(0.1, 0.01 * impact);
    s.impact = impact;
    this.emit("shove", s);
  }

  private knock(s: PropState, impact: number, dirX: number, dirZ: number): void {
    const d = this.defs[s.id]!;
    const r = PROP_CATALOG[d.category].reaction;
    s.dirX = dirX;
    s.dirZ = dirZ;
    s.impact = impact;
    s.wobble = 0;
    s.bounces = 0;
    s.t = 0;
    if (r.down === "flatten") {
      s.phase = "down";
      s.squash = 0.22;
      s.downAt = this.time;
      this.emit("flatten", s);
      return;
    }
    s.phase = "falling";
    s.angle = 0;
    s.angularVel = 0.6 + impact * 0.04;
    this.emit("knock", s);
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
    let down = 0;
    let oldest: PropState | null = null;
    for (const s of this.states) {
      switch (s.phase) {
        case "standing":
          continue;
        case "wobbling":
          s.t += h;
          if (s.t >= c.wobbleDuration) {
            s.phase = "standing";
            s.t = 0;
            s.wobble = 0;
          }
          this.dirty.add(s.id);
          continue;
        case "shoved": {
          s.t += h;
          const d = this.defs[s.id]!;
          const maxSlide = PROP_CATALOG[d.category].reaction.maxSlide;
          s.slide = Math.min(maxSlide, s.slide + s.slideVel * h);
          s.slideVel = s.slide >= maxSlide ? 0 : Math.max(0, s.slideVel - c.slideDrag * h);
          if (s.slideVel <= 0 && s.t >= 0.5) {
            s.phase = "standing";
            s.t = 0;
            s.wobble = 0;
          }
          this.dirty.add(s.id);
          continue;
        }
        case "falling":
          this.stepFall(s, h);
          this.dirty.add(s.id);
          continue;
        case "down": {
          s.t += h;
          down++;
          if (!oldest || s.downAt < oldest.downAt) oldest = s;
          const d = this.defs[s.id]!;
          if (s.forced || s.t >= PROP_CATALOG[d.category].downDuration) this.tryRestore(s, carX, carZ, s.forced ? c.clearRadius : c.restoreMinDistance);
          continue;
        }
        case "restoring":
          s.t += h;
          if (s.t >= c.restoreDuration) {
            const id = s.id;
            Object.assign(s, freshState(id));
            this.emit("restore", s);
          } else this.dirty.add(s.id);
          continue;
      }
    }
    if (down > c.maxDown && oldest) this.tryRestore(oldest, carX, carZ, c.restoreMinDistance);
  }

  private stepFall(s: PropState, h: number): void {
    const d = this.defs[s.id]!;
    const r = PROP_CATALOG[d.category].reaction;
    const rest = r.restAngle;
    s.t += h;
    if (this.reducedMotion) {
      s.angle = Math.min(rest, s.angle + (rest / 0.3) * h);
      if (s.angle >= rest) this.settle(s, rest);
      return;
    }
    s.angularVel += r.gravity * Math.sin(Math.max(0.08, s.angle)) * h;
    s.angle += s.angularVel * h;
    if (s.angle >= rest) {
      s.angle = rest;
      if (s.angularVel > 0.8 && s.bounces < 1) {
        s.angularVel = -s.angularVel * this.config.restitution;
        s.bounces++;
      } else this.settle(s, rest);
    }
    if (s.t > 5) this.settle(s, rest);
  }

  private settle(s: PropState, rest: number): void {
    s.phase = "down";
    s.angle = rest;
    s.angularVel = 0;
    s.t = 0;
    s.downAt = this.time;
    this.emit("settle", s);
  }

  private tryRestore(s: PropState, carX: number, carZ: number, minDistance: number): void {
    const d = this.defs[s.id]!;
    if (Math.hypot(d.x - carX, d.z - carZ) < minDistance) return;
    s.phase = "restoring";
    s.t = 0;
    s.forced = false;
    this.emit("restore", s);
  }

  /** "Reset world": every damaged prop is restored now, except those under the car, which come back once it leaves. */
  resetWorld(carX: number, carZ: number): void {
    for (const s of this.states) {
      if (s.phase === "standing" || s.phase === "restoring") continue;
      if (s.phase === "wobbling" || s.phase === "shoved") {
        // Back to where it was placed (a shoved prop included).
        Object.assign(s, freshState(s.id));
        this.dirty.add(s.id);
        continue;
      }
      if (s.phase === "falling") this.settle(s, PROP_CATALOG[this.defs[s.id]!.category].reaction.restAngle);
      s.forced = true;
      this.tryRestore(s, carX, carZ, this.config.clearRadius);
    }
  }

  /** Visual tilt for the current state (wobbling is a damped oscillation along the push direction). */
  tilt(s: PropState): number {
    if (s.phase === "wobbling" || s.phase === "shoved") {
      const k = Math.max(0, 1 - s.t / this.config.wobbleDuration);
      return s.wobble * Math.sin(s.t * 24) * k * k;
    }
    if (s.phase === "falling" || s.phase === "down") return s.angle;
    return 0;
  }

  /** 0 → 1 restore progress (uniform scale) while restoring; 1 otherwise. */
  growth(s: PropState): number {
    if (s.phase !== "restoring") return 1;
    const p = Math.min(1, s.t / this.config.restoreDuration);
    return p * p * (3 - 2 * p);
  }
}

/** The live simulation shared by physics, renderer and HUD (client singleton). */
export const propWorld = new PropWorld();
