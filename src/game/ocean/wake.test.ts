import { describe, expect, it } from "vitest";
import { WAKE_LIFE, WAKE_POINTS, WAKE_SPACING, WakeTrail, wakeStrength } from "./wake";

describe("wake trail", () => {
  it("records a point every WAKE_SPACING units, never more, and wraps around a fixed ring", () => {
    const w = new WakeTrail(8);
    expect(w.record(0, 0, 0, 1)).toBe(true);
    expect(w.record(WAKE_SPACING * 0.5, 0, 0.1, 1)).toBe(false);
    expect(w.record(WAKE_SPACING * 1.01, 0, 0.2, 1)).toBe(true);
    for (let i = 2; i < 30; i++) w.record(i * WAKE_SPACING * 1.01, 0, i * 0.1, 1);
    expect(w.count).toBe(8);
    expect(w.data.length).toBe(8 * 4);
  });
  it("ignores an idle boat and forgets everything on clear", () => {
    const w = new WakeTrail(4);
    expect(w.record(0, 0, 0, 0)).toBe(false);
    w.record(0, 0, 0, 1);
    w.record(5, 0, 1, 1);
    expect(w.alive(1)).toBe(2);
    expect(w.alive(1 + WAKE_LIFE + 1)).toBe(0);
    w.clear();
    expect(w.count).toBe(0);
    expect(w.alive(1)).toBe(0);
  });
  it("foam strength grows with speed and throttle, capped at 1", () => {
    expect(wakeStrength(0, 0, 16)).toBe(0);
    expect(wakeStrength(8, 0, 16)).toBeGreaterThan(0.3);
    expect(wakeStrength(16, 1, 16)).toBe(1);
    expect(wakeStrength(-4, 0, 16)).toBeGreaterThan(0);
    expect(WAKE_POINTS).toBeGreaterThanOrEqual(16);
  });
});

describe("wake trail order", () => {
  it("exposes the ring in chronological order before and after wrapping", () => {
    const w = new WakeTrail(4);
    for (let i = 0; i < 3; i++) w.record(i * 10, 0, i, 1);
    expect([0, 1, 2].map((i) => w.data[w.slot(i) * 4])).toEqual([0, 10, 20]);
    for (let i = 3; i < 6; i++) w.record(i * 10, 0, i, 1);
    // Capacity 4: the oldest alive is point 2 (x = 20), the newest point 5 (x = 50).
    expect([0, 1, 2, 3].map((i) => w.data[w.slot(i) * 4])).toEqual([20, 30, 40, 50]);
  });
});
