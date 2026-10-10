/**
 * Proximity zones. Pure resolver with hysteresis: once a zone is active it
 * stays active until the car leaves a slightly larger radius, so the prompt
 * does not flicker at the boundary.
 */
export interface Zone<Id extends string = string> {
  id: Id;
  x: number;
  z: number;
  radius: number;
}

export const EXIT_HYSTERESIS = 1.25;

export function resolveActiveZone<Id extends string>(
  zones: readonly Zone<Id>[],
  x: number,
  z: number,
  currentId: Id | null,
  hysteresis = EXIT_HYSTERESIS,
): Id | null {
  let best: Id | null = null;
  let bestDist = Infinity;
  for (const zone of zones) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    const limit = zone.id === currentId ? zone.radius * hysteresis : zone.radius;
    if (d <= limit && d < bestDist) {
      best = zone.id;
      bestDist = d;
    }
  }
  return best;
}
