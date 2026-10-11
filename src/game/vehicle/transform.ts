/**
 * Car ⇄ aircraft transformation rules (V7). Pure data and functions: the
 * flight phases, when the transformation may start, how long it takes, and
 * the staged timeline the animated parts read (panels, wings, tail, wheels,
 * thruster) so the visual sequence is one function of a single progress value.
 */
export type CarForm = "car" | "plane";

export type FlightPhase = "ground" | "transforming-to-plane" | "plane-ready" | "flying" | "landing" | "transforming-to-car";

export const TRANSFORM_DURATION = { toPlane: 2.0, toCar: 1.8 } as const;

/** Fastest the car may move to start the transformation (stopped, in practice). */
export const TRANSFORM_MAX_SPEED = 1.5;
/** Fastest the rolled-out aircraft may move to fold back into a car. */
export const RECONFIGURE_MAX_SPEED = 1.0;

export interface TransformEligibility {
  ok: boolean;
  /** Human-readable reason shown by the HUD when the prompt cannot be offered. */
  reason: "paused" | "transition" | "too-fast" | "not-on-pad" | "colliding" | null;
}

export function canTransformToPlane(args: { playing: boolean; inTransition: boolean; onPad: boolean; speed: number; colliding: boolean }): TransformEligibility {
  if (!args.playing) return { ok: false, reason: "paused" };
  if (args.inTransition) return { ok: false, reason: "transition" };
  if (!args.onPad) return { ok: false, reason: "not-on-pad" };
  if (args.colliding) return { ok: false, reason: "colliding" };
  if (Math.abs(args.speed) > TRANSFORM_MAX_SPEED) return { ok: false, reason: "too-fast" };
  return { ok: true, reason: null };
}

/** The aircraft may fold back once it has rolled out on a runway (or a pad) and stopped. */
export function canTransformToCar(args: { playing: boolean; inTransition: boolean; onGround: boolean; speed: number }): boolean {
  return args.playing && !args.inTransition && args.onGround && Math.abs(args.speed) <= RECONFIGURE_MAX_SPEED;
}

const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

/** 0..1 eased progress of a stage that runs between `start` and `end` of the whole sequence. */
export function stage(progress: number, start: number, end: number): number {
  return smooth((progress - start) / (end - start));
}

export interface TransformStages {
  /** Side panels unlock and slide. */
  panels: number;
  /** Wings sweep out from the flanks. */
  wings: number;
  /** Spoiler rises into the tail stabiliser and the fins emerge. */
  tail: number;
  /** Wheels tuck into the body. */
  wheels: number;
  /** Thruster powers up and the flight lights come on. */
  thruster: number;
}

/**
 * Staged timeline of the car → plane sequence for a progress 0..1 (the plane →
 * car sequence plays the same timeline backwards). Stages overlap so the
 * whole thing reads as one motion inside the 1.5–2.5 s budget.
 */
export function transformStages(progress: number): TransformStages {
  return {
    panels: stage(progress, 0.0, 0.3),
    wings: stage(progress, 0.15, 0.7),
    tail: stage(progress, 0.4, 0.85),
    wheels: stage(progress, 0.55, 0.9),
    thruster: stage(progress, 0.75, 1.0),
  };
}

/** Progress value the visuals should show for a form and an optional running transformation. */
export function visualProgress(form: CarForm, phase: FlightPhase, t: number, duration: number): number {
  const u = duration > 0 ? Math.max(0, Math.min(1, t / duration)) : 1;
  if (phase === "transforming-to-plane") return u;
  if (phase === "transforming-to-car") return 1 - u;
  return form === "plane" ? 1 : 0;
}

/** Axis-aligned landing strip on the XZ plane, plus the height of its surface. */
export interface Runway {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  /** Heading along the strip (either direction is fine for landing). */
  heading: number;
}

export function overRunway(r: Runway, x: number, z: number, margin = 0): boolean {
  return x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin;
}

/** The approach reads as "landing zone detected" when the aircraft is low, slow enough and near the strip. */
export function landingZoneDetected(r: Runway, x: number, y: number, z: number, speed: number, maxSpeed: number): boolean {
  return overRunway(r, x, z, 12) && y - r.y < 30 && speed <= maxSpeed;
}
