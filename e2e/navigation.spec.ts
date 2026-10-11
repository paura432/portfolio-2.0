import { expect, test, type Page } from "@playwright/test";
import { car, collectErrors, startGame } from "./helpers";

/**
 * V9 navigation: the P0 "car wedged beside a building, a planter and the
 * sidewalk". The physics sweep (`wedgeSweep.ts`) found 295 such points
 * before the fix; the worst of them beside Duplex, TrustOS and the plaza are
 * staged here with a teleport and then driven out with real keys only.
 */
const POSES: { x: number; z: number; heading: number; near: string }[] = [
  { x: -18.5, z: -17, heading: Math.PI / 2, near: "Duplex forecourt corner, facing the facade" },
  { x: -18.5, z: -18.5, heading: Math.PI, near: "Duplex forecourt corner, facing north" },
  { x: -30.5, z: 7, heading: 0, near: "TrustOS north side, bench and tree" },
  { x: -32, z: 26.5, heading: -Math.PI / 2, near: "TrustOS south side between tree and facade" },
  { x: -6.5, z: 17.5, heading: Math.PI / 4, near: "plaza south exit between tree and bench" },
];

/** Hold a key combination for a wall-clock budget, polling the car's displacement from `from`. */
async function tryKeys(page: Page, keys: string[], from: { x: number; z: number }, ms: number): Promise<number> {
  for (const k of keys) await page.keyboard.down(k);
  const t0 = Date.now();
  let best = 0;
  try {
    while (Date.now() - t0 < ms) {
      const c = await car(page);
      best = Math.max(best, Math.hypot(c.x - from.x, c.z - from.z));
      if (best > 2.5) return best;
      await page.waitForTimeout(150);
    }
  } finally {
    for (const k of keys) await page.keyboard.up(k);
  }
  return best;
}

test.describe("V9 navigation: no wedges", () => {
  test.setTimeout(300_000);
  test("from every former wedge pose the car drives out with plain inputs", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    for (const p of POSES) {
      await page.evaluate(({ x, z, heading }) => window.__pauWorld!.teleport(x, z, heading), p);
      await page.waitForTimeout(400);
      const from = await car(page);
      let best = 0;
      const tried: string[] = [];
      // Software rendering clamps the physics to 0.1 s per frame: 8 s of wall-clock is a few seconds of driving.
      for (const keys of [["KeyS"], ["KeyW"], ["KeyS", "KeyA"], ["KeyW", "KeyD"], ["KeyW", "KeyA"], ["KeyS", "KeyD"]]) {
        tried.push(keys.join("+"));
        best = Math.max(best, await tryKeys(page, keys, from, 8_000));
        if (best > 2.5) break;
      }
      expect(best, `${p.near} at (${p.x}, ${p.z}): escaped with ${tried.join(" → ")}`).toBeGreaterThan(2.5);
    }
    expect(errors()).toEqual([]);
  });
});
