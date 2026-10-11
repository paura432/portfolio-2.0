import { expect, test } from "@playwright/test";
import { collectErrors, holdKeyUntil, startGame } from "./helpers";
import { sailTo, steer, vehicle } from "./flight";

/**
 * V9 · the beaches not covered by `transformer.spec.ts` (South in, East out):
 * East Beach in, Skyport Beach out and in, and back out at South Beach's
 * far side. Only the start is staged; everything else is keys.
 */
test.describe("V9 universal beaches", () => {
  test.setTimeout(480_000);

  test("East Beach in → sail to Skyport Beach → wheels down on the Skyport → back into the water at Skyport Beach → out at South Beach", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // 1. From the east ring road's sidewalk, east into East Beach (edge x = 66, z 14..42), at 30 % of its width.
    await page.evaluate(() => window.__pauWorld!.teleport(46, 22, Math.PI / 2));
    await page.evaluate(() => {
      window.__pauWorld!.debug.telemetry(true);
      window.__pauWorld!.debug.clearLog();
    });
    const afloat = await holdKeyUntil(page, "KeyW", async () => (await vehicle(page)).state === "floating", 40_000);
    expect(afloat, "East Beach: hull out").toBe(true);
    expect(await page.evaluate(() => window.__pauWorld!.vehicleStates())).toEqual(["car", "transforming-to-boat", "floating"]);
    const b0 = await vehicle(page);
    expect(b0.x).toBeGreaterThan(70);
    // The hull came out on East Beach at the enter depth or deeper (the 1.1 s sequence at full speed carries the
    // hull ~20 u, past the 26 u beach band, so only its first frame is asserted on the beach).
    const seq = (await page.evaluate(() => window.__pauWorld!.debug.samples(200))).filter((v) => v.state === "transforming-to-boat");
    expect(seq.length).toBeGreaterThan(0);
    expect(seq[0]!.beach).toBe("east-beach");
    expect(seq[0]!.depth).toBeGreaterThanOrEqual(0.55);
    // 2. Sail south-east round the Skyport's south coast to the water off Skyport Beach (edge z = 36, x 112..138), then north up the sand.
    expect(await sailTo(page, [100, 60], 10)).toBe(true);
    expect(await sailTo(page, [125, 64], 10)).toBe(true);
    const ashore = await steer(page, () => [125, 30], null, (v) => v.state === "car", 90_000, "KeyW");
    expect(ashore, "Skyport Beach: wheels down").toBe(true);
    expect((await page.evaluate(() => window.__pauWorld!.vehicleStates())).slice(-3)).toEqual(["floating", "exiting-water", "car"]);
    const c1 = await vehicle(page);
    expect(c1.z).toBeLessThan(40);
    expect(c1.x).toBeGreaterThan(110);
    expect(c1.x).toBeLessThan(140);
    // 3. Onto the slab (the wheels-down is verified above). The re-entry is its own scenario: staged by a teleport
    // on the slab facing the beach (teleports only stage scenarios; every transformation comes from driving).
    expect(await holdKeyUntil(page, "KeyW", async () => (await vehicle(page)).z < 30, 30_000)).toBe(true);
    await page.evaluate(() => window.__pauWorld!.teleport(132, 26, 0));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__pauWorld!.debug.clearLog());
    const afloat2 = await steer(page, () => [132, 70], null, (v) => v.state === "floating", 60_000, "KeyW");
    if (!afloat2) {
      const samples = await page.evaluate(() => window.__pauWorld!.debug.samples(400));
      const contacts = await page.evaluate(() => window.__pauWorld!.debug.contactLog(20));
      throw new Error(`Skyport Beach: no hull out. contacts: ${JSON.stringify(contacts.map((c) => [c.what, c.x0.toFixed(1), c.z0.toFixed(1), c.reason]))}\n${samples.filter((_, i) => i % 4 === 0).map((v) => `${v.t.toFixed(2)} ${v.state.slice(0, 8)} x=${v.x.toFixed(1)} z=${v.z.toFixed(1)} h=${v.heading.toFixed(2)} v=${v.speed.toFixed(1)} beach=${v.beach} depth=${v.depth.toFixed(2)} ${v.blocked ? "BLK" : ""}`).join("\n")}`);
    }
    expect(await page.evaluate(() => window.__pauWorld!.vehicleStates())).toEqual(["car", "transforming-to-boat", "floating"]);
    // 4. Sail west to the water straight off South Beach's west third (edge z = 66, x 12..40; the bay's west wall
    // is at x = 12 and its shoulder pocket at (12, 71) can pin a hull steered into it: SEA-01), then north up the sand.
    expect(await sailTo(page, [100, 90], 12)).toBe(true);
    // Line up well south of the bay's mouth (the bay walls stand at x 12 and 40; a hull that turns north while
    // still west of x 12 ends up pushing into the coast), then straight north at the west third.
    expect(await sailTo(page, [26, 125], 4, 120_000)).toBe(true);
    // Kill the westward way before turning north (a hull still running west drifts into the bay's west wall and
    // its corner with the coast while the bow comes round), then pure pursuit of the line x = 24 with a 12 u
    // lookahead, which corrects lateral drift from the first metre instead of aiming at a far point.
    await holdKeyUntil(page, "Space", async () => (await vehicle(page)).speed < 1, 20_000);
    await page.evaluate(() => window.__pauWorld!.debug.clearLog());
    const ashore2 = await steer(page, (v) => [24, v.z - 12], null, (v) => v.state === "car", 150_000, "KeyW");
    if (!ashore2) {
      const samples = await page.evaluate(() => window.__pauWorld!.debug.samples(600));
      const contacts = await page.evaluate(() => window.__pauWorld!.debug.contactLog(20));
      throw new Error(`South Beach: no wheels down. contacts: ${JSON.stringify(contacts.map((c) => [c.what, c.x0.toFixed(1), c.z0.toFixed(1), c.reason]))}\n${samples.filter((_, i) => i % 6 === 0).map((v) => `${v.t.toFixed(2)} ${v.state.slice(0, 8)} x=${v.x.toFixed(1)} z=${v.z.toFixed(1)} h=${v.heading.toFixed(2)} v=${v.speed.toFixed(1)} beach=${v.beach} depth=${v.depth.toFixed(2)} ${v.blocked ? "BLK" : ""}`).join("\n")}`);
    }
    const c2 = await vehicle(page);
    expect(c2.z).toBeLessThan(70);
    expect(c2.x).toBeGreaterThan(10);
    expect(c2.x).toBeLessThan(42);
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "car");
    expect(errors()).toEqual([]);
  });
});
