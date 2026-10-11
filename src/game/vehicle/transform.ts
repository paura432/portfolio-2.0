/**
 * Staged timeline of the wing deployment (V7, kept by V8): one progress
 * value 0..1 drives the side panels, the wings, the tail, the wheels and the
 * thruster in overlapping windows, so the sequence reads as mechanical
 * rather than as a single morph. Runway rectangles for the Skyport strip.
 */
export function stage(progress: number, start: number, end: number): number {
  const u = (progress - start) / (end - start);
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
}

export interface TransformStages {
  panels: number;
  wings: number;
  tail: number;
  wheels: number;
  thruster: number;
}

export function transformStages(progress: number): TransformStages {
  return {
    panels: stage(progress, 0, 0.3),
    wings: stage(progress, 0.15, 0.7),
    tail: stage(progress, 0.4, 0.85),
    wheels: stage(progress, 0.55, 0.9),
    thruster: stage(progress, 0.75, 1),
  };
}

export interface Runway {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  heading: number;
}

export function overRunway(r: Runway, x: number, z: number, margin = 0): boolean {
  return x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin;
}
