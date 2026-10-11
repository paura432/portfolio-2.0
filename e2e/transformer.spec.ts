import { expect, test } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

/**
 * V8 PAU TRANSFORMER-X, played for real. Only the car's starting spot is
 * staged with a teleport; every transformation below comes from driving:
 * speed up the West City Ramp (wings deploy on the approach, the lip launches
 * the flight), fly, come back and land on the city's south turf, roll out
 * as a car; drive down South Beach into the sea (the hull deploys at the
 * enter depth), sail round to East Beach and drive out (wheels down at the
 * exit depth).
 */
import { flyTo, sailTo, steer, vehicle } from "./flight";

test.describe("PAU TRANSFORMER-X", () => {
  test.setTimeout(480_000);

  test("ramp: drive → wings deploy → lip launch → fly → land on the city → roll out as a car", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    expect((await vehicle(page)).state).toBe("car");
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "car");

    // 1. Stage the car before the West City Ramp's corridor, facing it; drive with W only.
    await page.evaluate(() => window.__pauWorld!.teleport(-53, 2, 0));
    await page.evaluate(() => {
      window.__pauWorld!.debug.telemetry(true);
      window.__pauWorld!.debug.clearLog();
    });
    const states: string[] = [];
    const flying = await holdKeyUntil(
      page,
      "KeyW",
      async () => {
        const v = await vehicle(page);
        if (states[states.length - 1] !== v.state) states.push(v.state);
        return v.state === "flying";
      },
      30_000,
    );
    if (!flying) {
      // Diagnostics on failure only: the run's speed / position / input / blocked samples and the contacts.
      const samples = await page.evaluate(() => window.__pauWorld!.debug.samples(600));
      const contacts = await page.evaluate(() => window.__pauWorld!.debug.contactLog(50));
      const line = samples.map((v) => `${v.t.toFixed(2)} ${v.state.slice(0, 6)} z=${v.z.toFixed(1)} v=${v.speed.toFixed(1)} th=${v.throttle} ${v.driving ? "" : "NODRIVE "}${v.blocked ? "BLK" : ""}`).join("\n");
      throw new Error(`took off: no. states: ${states.join(" → ")}\ncontacts: ${JSON.stringify(contacts)}\nsamples:\n${line}`);
    }
    // The sequence happened in order, on the move: corridor → wings → lip (the machine's own log, not a sample).
    expect(await page.evaluate(() => window.__pauWorld!.vehicleStates())).toEqual(["car", "preparing-flight", "transforming-to-plane", "flying"]);
    const p0 = await vehicle(page);
    expect(p0.authority).toBe("plane");
    expect(p0.y).toBeGreaterThan(4);
    expect(p0.speed).toBeGreaterThanOrEqual(14);
    expect(p0.z).toBeGreaterThan(50);
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "plane");
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "air");

    // 2. Climb south over the sea, then a wide left turn back north over the city's east side.
    expect(await flyTo(page, [-53, 130], 28, 30)).toBe(true);
    expect((await vehicle(page)).y).toBeGreaterThan(15);
    expect(await flyTo(page, [60, 130], 28, 30)).toBe(true);
    expect(await flyTo(page, [110, 60], 24, 30)).toBe(true);
    // 3. Final: west along z = 50 (the south turf, clear of buildings): level over the sea, descend once over the island's edge.
    expect(await flyTo(page, [96, 50], 14, 12)).toBe(true);
    expect(await steer(page, (v) => [v.x - 40, 50], 14, (v) => v.x < 61, 60_000)).toBe(true);
    const touched = await steer(page, (v) => [v.x - 40, 50], -50, (v) => v.authority === "car" || v.authority === "boat", 60_000);
    expect(touched, "touched down").toBe(true);
    const landed = await vehicle(page);
    expect(landed.authority, "landed on the island, not in the sea").toBe("car");
    expect(landed.x).toBeLessThan(62);
    expect(["landing", "transforming-to-car", "car"]).toContain(landed.state);
    // 4. Brake to a stop: the wings fold on their own and the car is back.
    expect(await holdKeyUntil(page, "Space", async () => (await vehicle(page)).speed < 0.5, 20_000)).toBe(true);
    await expect.poll(() => vehicle(page).then((v) => v.state), { timeout: 10_000 }).toBe("car");
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "car");
    const c = await car(page);
    expect(await holdKeyUntil(page, "KeyS", async () => Math.hypot((await car(page)).x - c.x, (await car(page)).z - c.z) > 2, 20_000)).toBe(true);
    expect(errors(), "no console errors").toEqual([]);
  });

  test("beach: drive into the sea → hull out → sail to another beach → wheels down → drive", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // 1. From the south ring road down South Beach into the water with W; the hull deploys past the enter depth.
    await page.evaluate(() => window.__pauWorld!.teleport(26, 46, 0));
    const states: string[] = [];
    const afloat = await holdKeyUntil(
      page,
      "KeyW",
      async () => {
        const v = await vehicle(page);
        if (states[states.length - 1] !== v.state) states.push(v.state);
        return v.state === "floating";
      },
      30_000,
    );
    expect(afloat, `floated; states: ${states.join(" → ")}`).toBe(true);
    expect(await page.evaluate(() => window.__pauWorld!.vehicleStates())).toEqual(["car", "transforming-to-boat", "floating"]);
    const b0 = await vehicle(page);
    expect(b0.authority).toBe("boat");
    expect(b0.z).toBeGreaterThan(70);
    expect(b0.speed).toBeGreaterThan(5);
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "boat");
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "sea");
    // 2. Sail round the south-east corner to East Beach (x 84 → 66, z 14…42), then up the sand.
    expect(await sailTo(page, [26, 105], 10)).toBe(true);
    expect(await sailTo(page, [100, 95], 12)).toBe(true);
    expect(await sailTo(page, [100, 28], 10)).toBe(true);
    const states2: string[] = [];
    const ashore = await steer(
      page,
      () => [40, 28],
      null,
      (v) => {
        if (states2[states2.length - 1] !== v.state) states2.push(v.state);
        return v.state === "car";
      },
      60_000,
      "KeyW",
    );
    expect(ashore, `came ashore; states: ${states2.join(" → ")}`).toBe(true);
    expect((await page.evaluate(() => window.__pauWorld!.vehicleStates())).slice(-3)).toEqual(["floating", "exiting-water", "car"]);
    const c = await vehicle(page);
    expect(c.x).toBeLessThan(70);
    expect(c.z).toBeGreaterThan(12);
    expect(c.z).toBeLessThan(44);
    await expect(page.getByTestId("mode-badge")).toHaveAttribute("data-mode", "car");
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "city");
    expect(errors(), "no console errors").toEqual([]);
  });

  test("guards: a slow car hops off the lip, wet sand keeps the car, the menu freezes the aircraft, reset recovers", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Slow over the lip (staged two thirds up the slope, W released 4 u before the lip): no flight, a hop, and back on the ground as a car.
    await page.evaluate(() => window.__pauWorld!.teleport(-53, 46, 0));
    await page.waitForTimeout(400);
    let maxY = 0;
    let sawPlane = false;
    let pressed = true;
    await page.keyboard.down("KeyW");
    const t0 = Date.now();
    // Wall-clock budget only as a safety net: under software rendering the run-up alone can take 10 s.
    while (Date.now() - t0 < 40_000) {
      const v = await vehicle(page);
      maxY = Math.max(maxY, v.y);
      if (v.authority === "plane") sawPlane = true;
      if (pressed && v.z > 50) {
        await page.keyboard.up("KeyW");
        pressed = false;
      }
      if (v.z > 56 && v.y < 0.05 && v.authority === "car") break;
      await page.waitForTimeout(100);
    }
    if (pressed) await page.keyboard.up("KeyW");
    expect(sawPlane, "never became an aircraft").toBe(false);
    expect(maxY, "left the lip").toBeGreaterThan(5);
    await expect.poll(() => vehicle(page).then((v) => v.state), { timeout: 10_000 }).toBe("car");
    expect((await vehicle(page)).z).toBeGreaterThan(54.5); // past the lip (z 54)
    expect((await vehicle(page)).y).toBeLessThan(0.05);
    // Wet sand (between the exit and enter depths): the car stays a car.
    await page.evaluate(() => window.__pauWorld!.teleport(26, 71, 0));
    await page.waitForTimeout(1500);
    expect((await vehicle(page)).state).toBe("car");
    expect((await vehicle(page)).nearbyBeach).toBe("south-beach");
    // Airborne (staged): the menu freezes the aircraft; reset puts the car at the nearest recovery point.
    await page.evaluate(() => window.__pauWorld!.teleportPlane(-53, 40, 100, 0));
    await expect.poll(() => vehicle(page).then((v) => v.state)).toBe("flying");
    await page.waitForTimeout(600);
    await page.keyboard.press("KeyM");
    await expect(page.getByTestId("projects-menu")).toBeVisible();
    const frozen = await vehicle(page);
    await page.waitForTimeout(700);
    const still = await vehicle(page);
    expect(Math.hypot(still.x - frozen.x, still.y - frozen.y, still.z - frozen.z)).toBeLessThan(0.05);
    await page.keyboard.press("Escape");
    await expect.poll(() => vehicle(page).then((v) => v.z), { timeout: 10_000 }).toBeGreaterThan(frozen.z + 2);
    await page.getByTestId("reset-car").click();
    await expect.poll(() => vehicle(page).then((v) => v.state)).toBe("car");
    const r = await vehicle(page);
    expect(Math.hypot(r.x - 26, r.z - 60)).toBeLessThan(1); // top of South Beach, the nearest recovery point
    // Quality cycles while afloat keep the hull afloat.
    await page.evaluate(() => window.__pauWorld!.teleportBoat(-120, 60, 0));
    const toggle = page.getByTestId("quality-toggle");
    for (const q of ["high", "medium", "low"]) {
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-quality", q);
    }
    expect((await vehicle(page)).state).toBe("floating");
  });
});
