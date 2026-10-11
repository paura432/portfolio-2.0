import { describe, expect, it } from "vitest";
import { displace, GERSTNER_GLSL, heightAt, SHORE_DAMP_DISTANCE, shoreDamp, WAVE_COUNT, WAVES, waveUniforms } from "./waves";

describe("gerstner waves (shared CPU/GPU table)", () => {
  it("has at most WAVE_COUNT waves with stable crests (Σ Q·w·A ≤ 1)", () => {
    expect(WAVES.length).toBeLessThanOrEqual(WAVE_COUNT);
    const u = waveUniforms();
    let sum = 0;
    for (let i = 0; i < WAVES.length; i++) sum += u.uWaveQ.value[i]! * u.uWaveFreq.value[i]! * u.uWaveAmp.value[i]!;
    expect(sum).toBeLessThanOrEqual(1);
  });
  it("uploads the same numbers the CPU uses", () => {
    const u = waveUniforms();
    expect(u.uWaveAmp.value.slice(0, WAVES.length)).toEqual(WAVES.map((w) => w.amplitude));
    for (let i = 0; i < WAVES.length; i++) {
      expect(u.uWaveFreq.value[i]).toBeCloseTo((2 * Math.PI) / WAVES[i]!.wavelength, 9);
      expect(u.uWavePhase.value[i]).toBeCloseTo(WAVES[i]!.speed * u.uWaveFreq.value[i]!, 9);
      const [dx, dz] = u.uWaveDir.value[i]!;
      expect(Math.hypot(dx, dz)).toBeCloseTo(1, 9);
    }
    // Padding keeps the GLSL arrays full.
    expect(u.uWaveAmp.value.length).toBe(WAVE_COUNT);
    expect(GERSTNER_GLSL).toContain(`#define WAVE_COUNT ${WAVE_COUNT}`);
  });
  it("displacement follows the Gerstner formula for one wave", () => {
    const w = WAVES[0]!;
    const k = (2 * Math.PI) / w.wavelength;
    const len = Math.hypot(w.dir[0], w.dir[1]);
    const dx = w.dir[0] / len;
    const dz = w.dir[1] / len;
    const q = w.steepness / (k * w.amplitude * WAVES.length);
    const t = 1.7;
    const theta = k * (dx * 3 + dz * -5) + w.speed * k * t;
    // Evaluate the full table and subtract the other waves' contributions.
    const all = displace(3, -5, t);
    let yOthers = 0;
    let xOthers = 0;
    for (const o of WAVES.slice(1)) {
      const ko = (2 * Math.PI) / o.wavelength;
      const lo = Math.hypot(o.dir[0], o.dir[1]);
      const odx = o.dir[0] / lo;
      const odz = o.dir[1] / lo;
      const qo = o.steepness / (ko * o.amplitude * WAVES.length);
      const th = ko * (odx * 3 + odz * -5) + o.speed * ko * t;
      yOthers += o.amplitude * Math.sin(th);
      xOthers += odx * qo * o.amplitude * Math.cos(th);
    }
    expect(all.y - yOthers).toBeCloseTo(w.amplitude * Math.sin(theta), 9);
    expect(all.x - 3 - xOthers).toBeCloseTo(dx * q * w.amplitude * Math.cos(theta), 9);
  });
  it("heightAt inverts the horizontal displacement: the surface point above (x, z) has that height", () => {
    for (const [x, z, t] of [
      [0, 0, 0],
      [12.3, -7.1, 2.5],
      [-80, 30, 11],
      [200, 200, 100],
    ] as const) {
      const h = heightAt(x, z, t);
      // Find the rest position whose displaced x/z equals (x, z) and compare.
      let rx = x;
      let rz = z;
      for (let i = 0; i < 12; i++) {
        const p = displace(rx, rz, t);
        rx += x - p.x;
        rz += z - p.z;
      }
      const p = displace(rx, rz, t);
      expect(Math.hypot(p.x - x, p.z - z)).toBeLessThan(1e-6);
      expect(Math.abs(h - p.y)).toBeLessThan(1e-3);
    }
  });
  it("stays within the summed amplitude and moves with time", () => {
    const total = WAVES.reduce((a, w) => a + w.amplitude, 0);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 400; i++) {
      const h = heightAt((i * 7.3) % 90, (i * 3.1) % 60, i * 0.37);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
    expect(max).toBeLessThanOrEqual(total + 1e-9);
    expect(min).toBeGreaterThanOrEqual(-total - 1e-9);
    expect(max - min).toBeGreaterThan(total * 0.8);
    expect(heightAt(5, 5, 0)).not.toBeCloseTo(heightAt(5, 5, 1), 3);
  });
  it("damps to nothing at the shore and to full amplitude at sea", () => {
    expect(shoreDamp(-3)).toBe(0);
    expect(shoreDamp(0)).toBe(0);
    expect(shoreDamp(SHORE_DAMP_DISTANCE / 2)).toBeCloseTo(0.5, 9);
    expect(shoreDamp(SHORE_DAMP_DISTANCE)).toBe(1);
    expect(shoreDamp(100)).toBe(1);
    expect(heightAt(10, 10, 3, 0)).toBe(0);
  });
});
