/**
 * Boat wake trail (V6). A fixed ring of stern positions sampled every few
 * units of travel; the water shader paints foam along the polyline, wider
 * and fainter with age. No particles, no allocation after construction, one
 * uniform upload per frame.
 */
export const WAKE_POINTS = 24;
/** Travelled distance between two samples. */
export const WAKE_SPACING = 1.2;
/** Seconds a wake point stays visible. */
export const WAKE_LIFE = 7;

export class WakeTrail {
  /** Packed (x, z, birthTime, strength) per point, oldest overwritten first. */
  readonly data: Float32Array;
  private head = 0;
  private lastX = NaN;
  private lastZ = NaN;
  count = 0;

  constructor(readonly capacity = WAKE_POINTS) {
    this.data = new Float32Array(capacity * 4);
  }

  /** Drop a point when the stern moved far enough; `strength` 0..1 scales the foam (speed / throttle). */
  record(x: number, z: number, time: number, strength: number): boolean {
    if (strength <= 0.02) {
      // Idle: keep the trail continuous without spamming points.
      return false;
    }
    if (!Number.isNaN(this.lastX) && Math.hypot(x - this.lastX, z - this.lastZ) < WAKE_SPACING) return false;
    const i = this.head * 4;
    this.data[i] = x;
    this.data[i + 1] = z;
    this.data[i + 2] = time;
    this.data[i + 3] = Math.min(1, strength);
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
    this.lastX = x;
    this.lastZ = z;
    return true;
  }

  /** Forget everything (teleport, reset): no foam streak across the map. */
  clear(): void {
    this.data.fill(0);
    this.head = 0;
    this.count = 0;
    this.lastX = NaN;
    this.lastZ = NaN;
  }

  /** Ring slot of the i-th point in chronological order (0 = oldest alive slot). */
  slot(i: number): number {
    const start = this.count < this.capacity ? 0 : this.head;
    return (start + i) % this.capacity;
  }

  /** Number of points still younger than WAKE_LIFE at `time`. */
  alive(time: number): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (time - this.data[i * 4 + 2]! < WAKE_LIFE && this.data[i * 4 + 3]! > 0) n++;
    return n;
  }
}

export const boatWake = new WakeTrail();

/** Foam strength for a given forward speed and throttle (what the shader sees as the wake's intensity). */
export function wakeStrength(speed: number, throttle: number, maxSpeed: number): number {
  const v = Math.min(1, Math.abs(speed) / maxSpeed);
  return Math.min(1, v * 0.8 + throttle * 0.3);
}
