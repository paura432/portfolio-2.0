import { describe, expect, it } from "vitest";
import { ParticlePool, type EmitSpec } from "./particles";

const spec: EmitSpec = { x: 1, y: 2, z: 3, spread: 0.3, vx: 0, vy: 2, vz: 0, speed: 3, life: 1, sizeMin: 0.1, sizeMax: 0.2, tint: 2 };

describe("particle pool", () => {
  it("never exceeds its capacity and recycles the oldest when full", () => {
    const pool = new ParticlePool(10, { gravity: 9.8, bounce: 0.3, drag: 0.9, floor: 0 });
    expect(pool.emit(8, spec)).toBe(8);
    expect(pool.count).toBe(8);
    pool.update(0.5);
    expect(pool.emit(6, spec)).toBe(6);
    expect(pool.count).toBe(10);
    expect(pool.emitted).toBe(14);
    for (let i = 0; i < pool.count; i++) expect(pool.life[i]).toBeGreaterThan(0);
  });

  it("particles die after their lifetime and the arrays stay packed", () => {
    const pool = new ParticlePool(32, { gravity: 9.8, bounce: 0.3, drag: 0.9, floor: 0 });
    pool.emit(20, spec);
    for (let t = 0; t < 2; t += 1 / 60) pool.update(1 / 60);
    expect(pool.count).toBe(0);
    pool.emit(3, { ...spec, life: 0.5 });
    pool.update(0.2);
    expect(pool.count).toBe(3);
    pool.update(0.2);
    expect(pool.count).toBeLessThanOrEqual(3);
    for (let i = 0; i < pool.count; i++) expect(pool.fraction(i)).toBeGreaterThan(0);
  });

  it("never goes below the floor and bounces with the configured restitution", () => {
    const pool = new ParticlePool(16, { gravity: 20, bounce: 0.4, drag: 1, floor: 0.05 });
    pool.emit(16, { ...spec, y: 0.5, vy: 0, speed: 0, life: 3 });
    let minY = Infinity;
    let bounced = false;
    for (let t = 0; t < 1.5; t += 1 / 120) {
      pool.update(1 / 120);
      for (let i = 0; i < pool.count; i++) {
        minY = Math.min(minY, pool.y[i]!);
        if (pool.vy[i]! > 0) bounced = true;
      }
    }
    expect(minY).toBeGreaterThanOrEqual(0.05);
    expect(bounced).toBe(true);
  });

  it("is deterministic for the same seed and allocates nothing after construction", () => {
    const a = new ParticlePool(8, { gravity: 9.8, bounce: 0.3, drag: 0.9, floor: 0 }, 42);
    const b = new ParticlePool(8, { gravity: 9.8, bounce: 0.3, drag: 0.9, floor: 0 }, 42);
    a.emit(8, spec);
    b.emit(8, spec);
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    const xs = a.x;
    a.update(0.1);
    a.emit(4, spec);
    expect(a.x).toBe(xs);
    expect(a.tint[0]).toBe(2);
  });
});
