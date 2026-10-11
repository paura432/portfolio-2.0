import { expect, test } from "@playwright/test";
import { collectErrors, holdKeyUntil, startGame } from "./helpers";
import { flyTo, steer, vehicle } from "./flight";

/**
 * V9 · the other two launch ramps, driven for real (the West City Ramp is
 * `transformer.spec.ts`). Only the start is staged; W does the run-up, the
 * wings deploy on the approach, the lip launches, the keys fly, and the
 * aircraft lands on open ground and rolls out as the car.
 */
test.describe("V9 launch ramps", () => {
  test.setTimeout(420_000);

  test("Campus Ramp: from the campus plaza, deploy on the approach, launch over the east cross road, fly, land on the south-east turf, car again", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Staged at rest on the campus plaza's west strip (between the ring road and the AI Workflow lab), facing south;
    // W plus steering toward the corridor's centre line (a point far past the lip, so the pursuit never flips) runs
    // the car down the approach: the wings deploy there and the lip launches.
    await page.evaluate(() => window.__pauWorld!.teleport(50.5, -51, 0));
    await page.evaluate(() => {
      window.__pauWorld!.debug.telemetry(true);
      window.__pauWorld!.debug.clearLog();
    });
    // Pure pursuit of the corridor's centre line with a 10 u lookahead (a point far ahead alone sits inside the
    // helper's heading deadband and never corrects the 2.5 u lateral offset: the deck rail is solid).
    const flying = await steer(page, (v) => [53, v.z + 10], null, (v) => v.state === "flying", 60_000, "KeyW");
    if (!flying) {
      const samples = await page.evaluate(() => window.__pauWorld!.debug.samples(600));
      const contacts = await page.evaluate(() => window.__pauWorld!.debug.contactLog(30));
      const states = await page.evaluate(() => window.__pauWorld!.vehicleStates());
      const line = samples.filter((_, i) => i % 3 === 0).map((v) => `${v.t.toFixed(2)} ${v.state.slice(0, 6)} x=${v.x.toFixed(1)} z=${v.z.toFixed(1)} h=${v.heading.toFixed(2)} v=${v.speed.toFixed(1)} st=${v.steer} ${v.blocked ? "BLK" : ""}`).join("\n");
      throw new Error(`Campus Ramp: no launch. states: ${states.join(" → ")}\ncontacts: ${JSON.stringify(contacts.map((c) => [c.what, c.x0.toFixed(1), c.z0.toFixed(1), c.reason]))}\n${line}`);
    }
    expect(await page.evaluate(() => window.__pauWorld!.vehicleStates())).toEqual(["car", "preparing-flight", "transforming-to-plane", "flying"]);
    const p0 = await vehicle(page);
    expect(p0.speed).toBeGreaterThanOrEqual(14);
    expect(p0.z).toBeGreaterThan(-6);
    expect(p0.x).toBeGreaterThan(49);
    expect(p0.x).toBeLessThan(57);
    // Climb south over the island and the sea, a wide turn, and a final west along z = 50 (the south turf).
    expect(await flyTo(page, [53, 120], 26, 30)).toBe(true);
    expect(await flyTo(page, [110, 110], 26, 30)).toBe(true);
    expect(await flyTo(page, [110, 60], 22, 30)).toBe(true);
    expect(await flyTo(page, [96, 50], 14, 12)).toBe(true);
    expect(await steer(page, (v) => [v.x - 40, 50], 14, (v) => v.x < 61, 60_000)).toBe(true);
    const touched = await steer(page, (v) => [v.x - 40, 50], -50, (v) => v.authority === "car" || v.authority === "boat", 60_000);
    expect(touched, "touched down").toBe(true);
    expect((await vehicle(page)).authority, "on the island").toBe("car");
    expect(await holdKeyUntil(page, "Space", async () => (await vehicle(page)).speed < 0.5, 20_000)).toBe(true);
    await expect.poll(() => vehicle(page).then((v) => v.state), { timeout: 10_000 }).toBe("car");
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "car");
    expect(errors()).toEqual([]);
  });

  test("Skyport Ramp: from the runway threshold at rest, the whole runway as approach, launch over the sea, fly back and land on the Skyport slab", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Staged at rest on the runway threshold (the former pad), facing east down the runway.
    await page.evaluate(() => window.__pauWorld!.teleport(124, -9, Math.PI / 2));
    const flying = await holdKeyUntil(page, "KeyW", async () => (await vehicle(page)).state === "flying", 40_000);
    expect(flying, "launched from the Skyport Ramp").toBe(true);
    expect(await page.evaluate(() => window.__pauWorld!.vehicleStates())).toEqual(["car", "preparing-flight", "transforming-to-plane", "flying"]);
    const p0 = await vehicle(page);
    expect(p0.speed).toBeGreaterThanOrEqual(14);
    expect(p0.x).toBeGreaterThan(192);
    // Out over the sea, a wide left turn north then west over the city's north coast, and a final eastbound along
    // z = 0: the causeway deck (x 56–104) and the island's apron road form one continuous landable strip.
    expect(await flyTo(page, [240, -9], 26, 30)).toBe(true);
    expect(await flyTo(page, [240, -90], 26, 30)).toBe(true);
    expect(await flyTo(page, [120, -110], 26, 30)).toBe(true);
    expect(await flyTo(page, [40, -60], 20, 30)).toBe(true);
    // Level over the causeway at 16 u to the slab's west edge, then descend along the apron line (z = 0) with a
    // centre-line pursuit: 90 u of slab ahead. (The causeway strip is only ±2.7 u wide for a legal touchdown and
    // the sea beside it accepts a splashdown, so descending earlier turns a small drift into a boat.)
    expect(await steer(page, (v) => [v.x + 15, 0], 16, (v) => v.x > 110, 60_000)).toBe(true);
    const touched = await steer(page, (v) => [v.x + 15, 0], -50, (v) => v.authority === "car" || v.authority === "boat", 60_000);
    expect(touched, "touched down").toBe(true);
    const landed = await vehicle(page);
    expect(landed.authority, "on the Skyport slab, not in the sea").toBe("car");
    expect(landed.x).toBeGreaterThan(104);
    expect(landed.x).toBeLessThan(202);
    expect(await holdKeyUntil(page, "Space", async () => (await vehicle(page)).speed < 0.5, 20_000)).toBe(true);
    await expect.poll(() => vehicle(page).then((v) => v.state), { timeout: 10_000 }).toBe("car");
    expect(errors()).toEqual([]);
  });
});
