/**
 * Fixed-capacity particle pool on typed arrays: no allocation after
 * construction, packed so the first `count` entries are alive. Pure simulation
 * (gravity, ground bounce, lifetime); rendering reads the arrays each frame.
 */
export interface EmitSpec {
  /** Centre of emission. */
  x: number;
  y: number;
  z: number;
  /** Random spread around the centre. */
  spread: number;
  /** Base velocity (bias) and random speed. */
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  life: number;
  /** Per-particle size multiplier range. */
  sizeMin: number;
  sizeMax: number;
  /** Colour index (e.g. canopy tint) stored per particle. */
  tint: number;
}

export interface ParticleOptions {
  gravity: number;
  /** Velocity kept on ground contact (0 = stick). */
  bounce: number;
  /** Air drag per second (1 = none). */
  drag: number;
  /** Ground height; particles never go below it. */
  floor: number;
}

export class ParticlePool {
  readonly capacity: number;
  count = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly vz: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly size: Float32Array;
  readonly spin: Float32Array;
  readonly tint: Uint8Array;
  /** Total emitted (diagnostics). */
  emitted = 0;
  private seed: number;

  constructor(
    capacity: number,
    readonly options: ParticleOptions,
    seed = 7,
  ) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.tint = new Uint8Array(capacity);
    this.seed = seed >>> 0;
  }

  /** Deterministic 0..1 (mulberry32) so captures are reproducible. */
  private rand(): number {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Emit up to `n` particles; when the pool is full the oldest are recycled. */
  emit(n: number, spec: EmitSpec): number {
    let made = 0;
    for (let k = 0; k < n; k++) {
      let i: number;
      if (this.count < this.capacity) i = this.count++;
      else {
        // Recycle the particle with the least remaining life.
        i = 0;
        for (let j = 1; j < this.capacity; j++) if (this.life[j]! < this.life[i]!) i = j;
      }
      this.x[i] = spec.x + (this.rand() * 2 - 1) * spec.spread;
      this.y[i] = Math.max(this.options.floor, spec.y + (this.rand() * 2 - 1) * spec.spread);
      this.z[i] = spec.z + (this.rand() * 2 - 1) * spec.spread;
      const a = this.rand() * Math.PI * 2;
      const up = this.rand();
      const sp = spec.speed * (0.4 + this.rand() * 0.6);
      this.vx[i] = spec.vx + Math.cos(a) * sp;
      this.vz[i] = spec.vz + Math.sin(a) * sp;
      this.vy[i] = spec.vy + up * sp;
      this.life[i] = this.maxLife[i] = spec.life * (0.7 + this.rand() * 0.6);
      this.size[i] = spec.sizeMin + this.rand() * (spec.sizeMax - spec.sizeMin);
      this.spin[i] = (this.rand() * 2 - 1) * 6;
      this.tint[i] = spec.tint;
      made++;
      this.emitted++;
    }
    return made;
  }

  update(dt: number): void {
    const { gravity, bounce, drag, floor } = this.options;
    const k = Math.pow(drag, dt);
    let i = 0;
    while (i < this.count) {
      const life = (this.life[i] = this.life[i]! - dt);
      if (life <= 0) {
        this.swapRemove(i);
        continue;
      }
      this.vy[i] = this.vy[i]! - gravity * dt;
      this.vx[i] = this.vx[i]! * k;
      this.vz[i] = this.vz[i]! * k;
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + this.vy[i]! * dt;
      this.z[i] = this.z[i]! + this.vz[i]! * dt;
      if (this.y[i]! < floor) {
        this.y[i] = floor;
        this.vy[i] = -this.vy[i]! * bounce;
        this.vx[i] = this.vx[i]! * 0.6;
        this.vz[i] = this.vz[i]! * 0.6;
        this.spin[i] = this.spin[i]! * 0.3;
      }
      i++;
    }
  }

  /** 0..1 remaining life fraction. */
  fraction(i: number): number {
    const m = this.maxLife[i]!;
    return m > 0 ? Math.max(0, this.life[i]! / m) : 0;
  }

  clear(): void {
    this.count = 0;
  }

  private swapRemove(i: number): void {
    const last = this.count - 1;
    if (i !== last) {
      for (const a of [this.x, this.y, this.z, this.vx, this.vy, this.vz, this.life, this.maxLife, this.size, this.spin]) a[i] = a[last]!;
      this.tint[i] = this.tint[last]!;
    }
    this.count = last;
  }
}

/** Live counters for the probe/perf tooling (written by the renderer each frame). */
export const particleStats = {
  active: 0,
  capacity: 0,
  set(active: number, capacity: number): void {
    this.active = active;
    this.capacity = capacity;
  },
};
