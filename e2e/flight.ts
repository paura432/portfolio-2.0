import type { Page } from "@playwright/test";

/** Probe view of the one vehicle (V8/V9). */
export type V = { state: string; authority: string; body: string; x: number; y: number; z: number; heading: number; speed: number; nearbyRamp: string | null; nearbyBeach: string | null; landingZone: boolean; progress: number };
export const vehicle = (page: Page): Promise<V> => page.evaluate(() => window.__pauWorld!.vehicle());
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Shared steering loop for the air and the water: A/D toward `target()`, W/S toward `altitude` (air only). */
export async function steer(page: Page, target: (v: V) => [number, number], altitude: number | null, done: (v: V) => boolean, timeoutMs: number, forward: "KeyW" | null = null): Promise<boolean> {
  const start = Date.now();
  let bank: "KeyA" | "KeyD" | null = null;
  let pitchKey: "KeyW" | "KeyS" | null = null;
  if (forward) await page.keyboard.down(forward);
  try {
    while (Date.now() - start < timeoutMs) {
      const v = await vehicle(page);
      if (done(v)) return true;
      const [tx, tz] = target(v);
      const err = wrap(Math.atan2(tx - v.x, tz - v.z) - v.heading);
      let nextBank: "KeyA" | "KeyD" | null = Math.abs(err) < 0.08 ? null : err > 0 ? "KeyA" : "KeyD";
      if (altitude !== null && nextBank && Math.abs(err) < 0.6) {
        // In the air, release the bank once the aircraft already leans toward the target: under software rendering a
        // frame can last half a second, and holding the key through it overshoots the heading and circles.
        const roll = (await page.evaluate(() => window.__pauWorld!.plane().roll)) as number;
        const leaning = err > 0 ? roll > 0.35 : roll < -0.35;
        if (leaning) nextBank = null;
      }
      if (nextBank !== bank) {
        if (bank) await page.keyboard.up(bank);
        if (nextBank) await page.keyboard.down(nextBank);
        bank = nextBank;
      }
      if (altitude !== null) {
        const dy = altitude - v.y;
        const nextPitch: "KeyW" | "KeyS" | null = dy > 3 ? "KeyW" : dy < -3 ? "KeyS" : null;
        if (nextPitch !== pitchKey) {
          if (pitchKey) await page.keyboard.up(pitchKey);
          if (nextPitch) await page.keyboard.down(nextPitch);
          pitchKey = nextPitch;
        }
      }
      await page.waitForTimeout(120);
    }
    return false;
  } finally {
    if (bank) await page.keyboard.up(bank);
    if (pitchKey) await page.keyboard.up(pitchKey);
    if (forward) await page.keyboard.up(forward);
  }
}
export const flyTo = (page: Page, t: [number, number], altitude: number, radius: number, timeoutMs = 60_000) => steer(page, () => t, altitude, (v) => Math.hypot(t[0] - v.x, t[1] - v.z) < radius, timeoutMs);
export const sailTo = (page: Page, t: [number, number], radius: number, timeoutMs = 90_000) => steer(page, () => t, null, (v) => Math.hypot(t[0] - v.x, t[1] - v.z) < radius, timeoutMs, "KeyW");
