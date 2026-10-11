/**
 * Destructible street furniture (V9): the catalogue of prop categories.
 *
 * Each category says how a prop is built (its parts, in the prop's local
 * frame: the same offsets the V3 placers used, so the rendered prop never
 * changes shape when it starts to move), how it collides (a circle for posts
 * and bushes, an oriented box for benches and planters) and how it reacts to
 * the car: a soft contact (below `shove`) only makes it wobble; a medium hit
 * shoves it (slides along the push, stays solid); a hard hit knocks it down.
 * The thresholds are approach speeds in u/s. Pure data: the simulation
 * (`propWorld`), the renderer, the particles and the tests all read it.
 */
import type { Obstacle } from "../physics/collision";

export type PropCategory = "lamp" | "planter" | "bench" | "bollard" | "bush" | "signpost" | "mast";

/** Every mesh the renderer instances for a category, keyed by a stable part name. */
export type PropPart = "post" | "arm" | "head" | "pool" | "box" | "foliage" | "seat" | "back" | "legs" | "cap";

export interface PartLocal {
  part: PropPart;
  /** Offset in the prop's local frame (x right, y up, z forward along its rotation). */
  pos: [number, number, number];
  /** Fixed local rotation (Euler XYZ), e.g. flat discs. */
  euler?: [number, number, number];
  scale?: [number, number, number];
  /** Emissive / glowing part: switched off once the prop is down (lamp heads, pools). */
  light?: boolean;
  /** Ground decal (light pool): never tilts with the prop and disappears once it is down. */
  ground?: boolean;
}

export type PropColliderShape = { kind: "circle"; r: number } | { kind: "obb"; hx: number; hz: number };

export interface Reaction {
  /** Approach speed from which the prop reacts at all (below it: a rigid bump with no animation). */
  wobble: number;
  /** Approach speed from which the prop is shoved: it slides along the push and stays solid. `Infinity` = never slides. */
  shove: number;
  /** Approach speed from which the prop is knocked down (topples about its base, or is flattened). */
  knock: number;
  /** Fraction of the car's speed kept when it knocks the prop down (1 = no resistance). */
  retain: number;
  /** What "down" means: a tipped body (pivoting at the base) or a flattened one (bushes). */
  down: "topple" | "flatten";
  /** Rest tilt of a toppled prop (radians from vertical). */
  restAngle: number;
  /** Slide distance per u/s of approach speed when shoved, and its cap. */
  slidePerSpeed: number;
  maxSlide: number;
  /** Angular acceleration gain while falling (lighter props fall faster). */
  gravity: number;
  /** Mass class for the HUD and particles. */
  weight: "light" | "medium" | "heavy";
}

export interface PropCategoryDef {
  category: PropCategory;
  label: string;
  parts: PartLocal[];
  collider: PropColliderShape;
  reaction: Reaction;
  /** Seconds a knocked prop stays down before it may be restored (never while the car is near). */
  downDuration: number;
}

export const PROP_CATALOG: Record<PropCategory, PropCategoryDef> = {
  lamp: {
    category: "lamp",
    label: "Street lamp",
    // Post 0.14 × 3.9 × 0.14 centred at 1.95; arm toward local +Z; head at the arm's end; light pool on the ground.
    parts: [
      { part: "post", pos: [0, 1.95, 0] },
      { part: "arm", pos: [0, 3.86, 0.5] },
      { part: "head", pos: [0, 3.82, 1.0], light: true },
      { part: "pool", pos: [0, 0.03, 1.2], euler: [-Math.PI / 2, 0, 0], scale: [3.4, 3.4, 1], light: true, ground: true },
    ],
    collider: { kind: "circle", r: 0.24 },
    reaction: { wobble: 0.6, shove: Infinity, knock: 5, retain: 0.72, down: "topple", restAngle: 1.5, slidePerSpeed: 0, maxSlide: 0, gravity: 5.5, weight: "medium" },
    downDuration: 25,
  },
  planter: {
    category: "planter",
    label: "Planter",
    // Concrete box 1.9 × 0.56 × 1.9 centred at 0.28 with a round bush on top.
    parts: [
      { part: "box", pos: [0, 0.28, 0] },
      { part: "foliage", pos: [0, 0.95, 0] },
    ],
    collider: { kind: "obb", hx: 0.95, hz: 0.95 },
    reaction: { wobble: 1.0, shove: 2.5, knock: 9, retain: 0.55, down: "topple", restAngle: 1.45, slidePerSpeed: 0.09, maxSlide: 1.2, gravity: 4.0, weight: "heavy" },
    downDuration: 25,
  },
  bench: {
    category: "bench",
    label: "Bench",
    // Seat 1.7 × 0.08 × 0.5 at 0.46, back 1.7 × 0.42 × 0.06 at 0.72 set 0.22 back, legs 1.4 × 0.4 × 0.36 at 0.2.
    parts: [
      { part: "seat", pos: [0, 0.46, 0] },
      { part: "back", pos: [0, 0.72, -0.22] },
      { part: "legs", pos: [0, 0.2, 0] },
    ],
    collider: { kind: "obb", hx: 0.85, hz: 0.3 },
    reaction: { wobble: 0.6, shove: 1.5, knock: 6, retain: 0.8, down: "topple", restAngle: 1.5, slidePerSpeed: 0.14, maxSlide: 1.8, gravity: 7, weight: "light" },
    downDuration: 25,
  },
  bollard: {
    category: "bollard",
    label: "Bollard",
    parts: [
      { part: "post", pos: [0, 0.4, 0] },
      { part: "cap", pos: [0, 0.82, 0], light: true },
    ],
    collider: { kind: "circle", r: 0.16 },
    reaction: { wobble: 0.6, shove: Infinity, knock: 4, retain: 0.78, down: "topple", restAngle: 1.5, slidePerSpeed: 0, maxSlide: 0, gravity: 8, weight: "medium" },
    downDuration: 25,
  },
  bush: {
    category: "bush",
    label: "Bush",
    parts: [{ part: "foliage", pos: [0, 0.45, 0], scale: [1, 0.8, 1] }],
    collider: { kind: "circle", r: 0.6 },
    reaction: { wobble: 0.3, shove: Infinity, knock: 3, retain: 0.88, down: "flatten", restAngle: 0, slidePerSpeed: 0, maxSlide: 0, gravity: 0, weight: "light" },
    downDuration: 20,
  },
  signpost: {
    category: "signpost",
    label: "Signpost",
    parts: [{ part: "post", pos: [0, 2.5, -0.1] }],
    collider: { kind: "circle", r: 0.2 },
    reaction: { wobble: 0.6, shove: Infinity, knock: 8, retain: 0.7, down: "topple", restAngle: 1.45, slidePerSpeed: 0, maxSlide: 0, gravity: 4.5, weight: "heavy" },
    downDuration: 30,
  },
  mast: {
    category: "mast",
    label: "Light mast",
    parts: [
      { part: "post", pos: [0, 2.2, 0] },
      { part: "head", pos: [0, 4.5, 0], light: true },
    ],
    collider: { kind: "circle", r: 0.22 },
    reaction: { wobble: 0.6, shove: Infinity, knock: 7, retain: 0.72, down: "topple", restAngle: 1.5, slidePerSpeed: 0, maxSlide: 0, gravity: 5, weight: "medium" },
    downDuration: 25,
  },
};

/** Categories wired into the simulation so far (the vertical slice grows per iteration; see docs/qa/v9-world-audit-state.json). */
export const ACTIVE_CATEGORIES: readonly PropCategory[] = ["lamp", "planter", "bench"];

/** The world-space collider of a prop in its current place (standing or shoved). */
export function propObstacle(id: string, category: PropCategory, x: number, z: number, rotation: number, scale = 1): Obstacle {
  const c = PROP_CATALOG[category].collider;
  if (c.kind === "circle") return { kind: "round", id, x, z, r: c.r * scale };
  return { kind: "obb", id, x, z, rotation, hx: c.hx * scale, hz: c.hz * scale };
}
