import { expect, test, type Page } from "@playwright/test";
import { car, collectErrors, startGame } from "./helpers";

/**
 * V9 navigation: the P0 "car wedged beside a building, a planter and the
 * sidewalk". The physics sweep (`wedgeSweep.ts`) found 295 such points
 * before the fix; the worst of them beside Duplex, TrustOS and the plaza are
 * staged here with a teleport and then driven with real keys only: out of
 * the pocket, along a free corridor, in reverse, always in car mode, never
 * with Reset.
 */
const POSES: { x: number; z: number; heading: number; near: string }[] = [
  { x: -18.5, z: -17, heading: Math.PI / 2, near: "Duplex forecourt corner, facing the facade" },
  { x: -18.5, z: -18.5, heading: Math.PI, near: "Duplex forecourt corner, facing north" },
  { x: -30.5, z: 7, heading: 0, near: "TrustOS north side, bench and tree" },
  { x: -32, z: 26.5, heading: -Math.PI / 2, near: "TrustOS south side between tree and facade" },
  { x: -6.5, z: 17.5, heading: Math.PI / 4, near: "plaza south exit between tree and bench" },
];
type V = { state: string; authority: string; body: string; heading: number };
const vehicle = (page: Page): Promise<V> => page.evaluate(() => window.__pauWorld!.vehicle());

/** Hold a key combination for a wall-clock budget, polling the car's displacement from `from`. */
async function tryKeys(page: Page, keys: string[], from: { x: number; z: number }, ms: number, need = 2.5): Promise<number> {
  for (const k of keys) await page.keyboard.down(k);
  const t0 = Date.now();
  let best = 0;
  try {
    while (Date.now() - t0 < ms) {
      const c = await car(page);
      best = Math.max(best, Math.hypot(c.x - from.x, c.z - from.z));
      if (best > need) return best;
      await page.waitForTimeout(150);
    }
  } finally {
    for (const k of keys) await page.keyboard.up(k);
  }
  return best;
}

test.describe("V9 navigation: no wedges", () => {
  test.setTimeout(420_000);
  test("from every former wedge pose the car drives out with plain inputs, stays a car, and never needs Reset", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    await page.evaluate(() => window.__pauWorld!.debug.telemetry(true));
    for (const p of POSES) {
      await page.evaluate(({ x, z, heading }) => window.__pauWorld!.teleport(x, z, heading), p);
      await page.waitForTimeout(400);
      await page.evaluate(() => window.__pauWorld!.debug.clearLog());
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
      const v = await vehicle(page);
      expect(v.state, `${p.near}: still a car`).toBe("car");
      expect(v.authority).toBe("car");
      // Every contact on the way out was a real thing: a building, a trunk, furniture or the drive-area edge.
      const contacts = await page.evaluate(() => window.__pauWorld!.debug.contactLog(200));
      for (const c of contacts) expect(["tree", "prop", "boundary", "ramp"].includes(c.what) || /^[a-z0-9:-]+$/.test(c.what), `contact ${c.what}`).toBe(true);
      // No position jump: consecutive samples never move more than one sub-step budget (0.67 u) plus a push-out.
      const samples = await page.evaluate(() => window.__pauWorld!.debug.samples(600));
      for (let i = 1; i < samples.length; i++) {
        const a = samples[i - 1]!;
        const b = samples[i]!;
        expect(Math.hypot(b.x - a.x, b.z - a.z), `${p.near}: frame jump`).toBeLessThan(3);
      }
    }
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "car");
    expect(errors()).toEqual([]);
  });

  test("Duplex forecourt corner: out of the pocket, then the sidewalk corridor forward 8 u and back 3 u, car mode throughout", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Staged once: on the sidewalk between the Duplex padding box (1.5 u west) and a boulevard tree (2.2 u east),
    // facing the tree; the only room is north–south along the facade. Everything after is keys.
    await page.evaluate(() => window.__pauWorld!.teleport(-18.5, -17, Math.PI / 2));
    await page.waitForTimeout(400);
    const start = await car(page);
    let best = 0;
    for (const keys of [["KeyS", "KeyA"], ["KeyW", "KeyD"], ["KeyW", "KeyA"], ["KeyS", "KeyD"], ["KeyS"], ["KeyW"]]) {
      best = Math.max(best, await tryKeys(page, keys, start, 8_000));
      if (best > 2.5) break;
    }
    expect(best, "out of the pocket").toBeGreaterThan(2.5);
    // Along the corridor: the south (+Z) is free for 12 u. Drive whichever way the nose points down the sidewalk.
    const south = Math.cos((await vehicle(page)).heading) > 0;
    const forwardKey = south ? "KeyW" : "KeyS";
    const backKey = south ? "KeyS" : "KeyW";
    const mid = await car(page);
    expect(await tryKeys(page, [forwardKey], mid, 20_000, 8), "8 u down the free sidewalk corridor").toBeGreaterThan(8);
    const far = await car(page);
    expect(await tryKeys(page, [backKey], far, 12_000, 3), "3 u back up the corridor").toBeGreaterThan(3);
    const v = await vehicle(page);
    expect(v.state).toBe("car");
    expect(v.authority).toBe("car");
    expect(errors()).toEqual([]);
  });
});
