import { expect, test, type Page } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

/**
 * V7 Sky Ascent, played for real: drive over the causeway onto the Skyport
 * pad, stop, transform with E (the wings come out over two seconds), run up
 * the runway with W until the nose rotates and the wheels leave the ground,
 * fly a loop over the sea and the city, line up with the runway, descend
 * with S, touch down, brake, and reconfigure with E back into the car. Only
 * the car's starting position on the east road is staged.
 */
const plane = (page: Page) => page.evaluate(() => window.__pauWorld!.plane());
const vehicle = (page: Page) => page.evaluate(() => window.__pauWorld!.vehicle());
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Shared steering loop: bank with A/D toward `target()`, climb/descend with W/S toward `altitude`; returns when `done()` holds. */
type PlaneProbe = Awaited<ReturnType<typeof plane>>;

async function steerAir(page: Page, target: (p: PlaneProbe) => [number, number], altitude: number, done: (p: PlaneProbe) => boolean, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  let bank: "KeyA" | "KeyD" | null = null;
  let pitchKey: "KeyW" | "KeyS" | null = null;
  try {
    while (Date.now() - start < timeoutMs) {
      const p = await plane(page);
      if (done(p)) return true;
      const [tx, tz] = target(p);
      const err = wrap(Math.atan2(tx - p.x, tz - p.z) - p.heading);
      // A banks left (heading increases), D banks right.
      const nextBank: "KeyA" | "KeyD" | null = Math.abs(err) < 0.08 ? null : err > 0 ? "KeyA" : "KeyD";
      const dy = altitude - p.y;
      const nextPitch: "KeyW" | "KeyS" | null = dy > 3 ? "KeyW" : dy < -3 ? "KeyS" : null;
      if (nextBank !== bank) {
        if (bank) await page.keyboard.up(bank);
        if (nextBank) await page.keyboard.down(nextBank);
        bank = nextBank;
      }
      if (nextPitch !== pitchKey) {
        if (pitchKey) await page.keyboard.up(pitchKey);
        if (nextPitch) await page.keyboard.down(nextPitch);
        pitchKey = nextPitch;
      }
      await page.waitForTimeout(120);
    }
    return false;
  } finally {
    if (bank) await page.keyboard.up(bank);
    if (pitchKey) await page.keyboard.up(pitchKey);
  }
}

/** Fly toward a fixed (x, z) at a wanted altitude; returns when within `radius`. */
const flyTo = (page: Page, target: [number, number], altitude: number, radius: number, timeoutMs = 60_000) =>
  steerAir(page, () => target, altitude, (p) => Math.hypot(target[0] - p.x, target[1] - p.z) < radius, timeoutMs);

/** Final approach: chase a carrot 40 u ahead on the runway centreline (z = `lineZ`, heading east) so the lateral error decays; returns once past `untilX` on the line. */
const flyAlong = (page: Page, lineZ: number, altitude: number, untilX: number, timeoutMs = 60_000) =>
  steerAir(page, (p) => [p.x + 40, lineZ], altitude, (p) => p.x >= untilX && Math.abs(p.z - lineZ) < 2 && Math.abs(wrap(p.heading - Math.PI / 2)) < 0.08, timeoutMs);

/** Drive the car toward waypoints in order with W held, steering with A/D (same sign convention as the aircraft); returns when `done` holds. */
async function driveVia(page: Page, waypoints: [number, number][], done: () => Promise<boolean>, timeoutMs = 60_000): Promise<boolean> {
  const start = Date.now();
  let steer: "KeyA" | "KeyD" | null = null;
  let i = 0;
  await page.keyboard.down("KeyW");
  try {
    while (Date.now() - start < timeoutMs) {
      if (await done()) return true;
      const c = await page.evaluate(() => window.__pauWorld!.car());
      if (i < waypoints.length - 1 && Math.hypot(waypoints[i]![0] - c.x, waypoints[i]![1] - c.z) < 6) i++;
      const [tx, tz] = waypoints[i]!;
      const err = wrap(Math.atan2(tx - c.x, tz - c.z) - c.heading);
      const next: "KeyA" | "KeyD" | null = Math.abs(err) < 0.06 ? null : err > 0 ? "KeyA" : "KeyD";
      if (next !== steer) {
        if (steer) await page.keyboard.up(steer);
        if (next) await page.keyboard.down(next);
        steer = next;
      }
      await page.waitForTimeout(100);
    }
    return false;
  } finally {
    if (steer) await page.keyboard.up(steer);
    await page.keyboard.up("KeyW");
  }
}

test.describe("sky ascent", () => {
  test.setTimeout(480_000);

  test("drive → transform → takeoff → fly → land → drive", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    expect((await vehicle(page)).carForm).toBe("car");

    // 1–2. From the east road, drive over the causeway onto the island and into the pad.
    await page.evaluate(() => window.__pauWorld!.teleport(50, 0, Math.PI / 2));
    // Straight along the causeway (z = 0), then off the apron onto the pad on the runway threshold.
    const onPad = await driveVia(page, [[112, 0], [124, -9]], async () => (await vehicle(page)).nearbyPad, 60_000);
    expect(onPad, "the car reached the transformation pad by driving").toBe(true);
    const prompt = page.getByTestId("transform-prompt");
    // Still rolling: E does nothing but leave a notice.
    expect(await holdKeyUntil(page, "Space", async () => Math.abs((await car(page)).speed) < 1, 15_000)).toBe(true);
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveAttribute("data-action", "to-plane");

    // 3–4. Transform: a visible sequence, then the aircraft is ready on the threshold.
    await page.keyboard.press("KeyE");
    await expect.poll(() => vehicle(page).then((v) => v.flight)).toBe("transforming-to-plane");
    await expect(page.getByTestId("hud-legend")).toContainText("Transforming");
    await expect.poll(() => vehicle(page).then((v) => v.flight), { timeout: 20_000 }).toBe("plane-ready");
    const v1 = await vehicle(page);
    expect(v1.carForm).toBe("plane");
    expect(v1.mode).toBe("plane-ready");
    await expect(page.getByTestId("mode-badge")).toContainText("Flight");
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "air");
    await expect(page.getByTestId("flight-readout")).toBeVisible();
    const p0 = await plane(page);
    expect(p0.onGround).toBe(true);
    expect(Math.abs(wrap(p0.heading - Math.PI / 2))).toBeLessThan(0.1);

    // 5. Takeoff: hold W down the runway until the wheels leave the ground.
    const airborne = await holdKeyUntil(page, "KeyW", async () => !(await plane(page)).onGround, 60_000);
    expect(airborne, "the aircraft lifted off").toBe(true);
    await expect.poll(() => vehicle(page).then((v) => v.flight)).toBe("flying");
    const p1 = await plane(page);
    expect(p1.speed).toBeGreaterThan(12);
    expect(p1.x).toBeGreaterThan(p0.x + 10);

    // 6. Fly: climb and turn back over the sea, then over the city, keeping a bounded attitude.
    expect(await flyTo(page, [240, -60], 30, 30)).toBe(true);
    const p2 = await plane(page);
    expect(p2.y).toBeGreaterThan(15);
    expect(Math.abs(p2.roll)).toBeLessThan(1);
    expect(await flyTo(page, [60, -40], 30, 30)).toBe(true);
    // Over the city the floor keeps the aircraft above the roofs even when diving.
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(2500);
    await page.keyboard.up("KeyS");
    expect((await plane(page)).y).toBeGreaterThanOrEqual(15.9);

    // 7. Land: a left-hand pattern west of the city (downwind, base, final) lines the aircraft up with the runway heading.
    expect(await flyTo(page, [-20, -40], 20, 30)).toBe(true);
    expect(await flyTo(page, [-60, 10], 20, 30)).toBe(true);
    expect(await flyTo(page, [-30, -9], 18, 25)).toBe(true);
    expect(await flyAlong(page, -9, 18, 85), "on final, on the runway centreline").toBe(true);
    // Air brake over the threshold: below the approach speed and over the runway the zone reads as valid.
    expect(await holdKeyUntil(page, "Space", async () => (await vehicle(page)).landingZone, 20_000), "the runway read as a landing zone").toBe(true);
    await expect(page.getByTestId("landing-zone")).toBeVisible();
    expect((await plane(page)).speed).toBeLessThanOrEqual(22);
    // Descend (S from the steering loop, which keeps tracking the centreline), air brake still on, until the wheels touch the runway.
    await page.keyboard.down("Space");
    const touched = await steerAir(page, (p) => [p.x + 40, -9], -50, (p) => p.onGround, 60_000);
    await page.keyboard.up("Space");
    if (!touched) console.log("no touchdown; aircraft:", JSON.stringify(await plane(page)));
    expect(touched, "the aircraft touched down on the runway").toBe(true);
    await expect.poll(() => vehicle(page).then((v) => v.flight)).toBe("landing");
    expect(await holdKeyUntil(page, "Space", async () => (await plane(page)).speed < 0.5, 30_000)).toBe(true);
    const landed = await plane(page);
    expect(landed.x).toBeGreaterThan(110);
    expect(landed.x).toBeLessThan(202);

    // 8. Reconfigure: E folds the aircraft back into the car where it stopped.
    await expect(prompt).toHaveAttribute("data-action", "to-car");
    await page.keyboard.press("KeyE");
    await expect.poll(() => vehicle(page).then((v) => v.flight)).toBe("transforming-to-car");
    await expect.poll(() => vehicle(page).then((v) => v.carForm), { timeout: 20_000 }).toBe("car");
    expect((await vehicle(page)).flight).toBe("ground");
    const c = await car(page);
    expect(Math.hypot(c.x - landed.x, c.z - landed.z)).toBeLessThan(0.5);
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "city");
    // Drive again.
    expect(await holdKeyUntil(page, "KeyS", async () => Math.hypot((await car(page)).x - c.x, (await car(page)).z - c.z) > 2, 20_000)).toBe(true);
    expect(errors(), "no console errors during the flight").toEqual([]);
  });

  test("no transformation off the pad or while fast; panels pause the aircraft; reset recovers mid-air", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // E on the road: nothing (no prompt, no notice because the pad is not nearby).
    await page.keyboard.press("KeyE");
    expect((await vehicle(page)).flight).toBe("ground");
    await expect(page.getByTestId("transform-prompt")).toHaveCount(0);
    // Roll through the pad fast and press E the frame it activates: refused with a notice.
    await page.evaluate(() => window.__pauWorld!.teleport(108, -9, Math.PI / 2));
    await page.keyboard.down("KeyW");
    const fast = await page.evaluate(
      () =>
        new Promise<{ speed: number; flight: string }>((resolve) => {
          const tick = () => {
            const v = window.__pauWorld!.vehicle();
            const c = window.__pauWorld!.car();
            if (v.nearbyPad && Math.abs(c.speed) > 5) {
              window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }));
              window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE", bubbles: true }));
              resolve({ speed: c.speed, flight: window.__pauWorld!.vehicle().flight });
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        }),
    );
    await page.keyboard.up("KeyW");
    expect(Math.abs(fast.speed)).toBeGreaterThan(5);
    expect(fast.flight).toBe("ground");
    await expect(page.getByTestId("flight-notice")).toContainText("Stop on the pad");

    // Airborne (staged): the menu freezes the aircraft; reset puts the car back on the pad.
    await page.evaluate(() => window.__pauWorld!.teleportPlane(150, 40, -9, Math.PI / 2, true));
    await expect.poll(() => vehicle(page).then((v) => v.flight)).toBe("flying");
    await page.waitForTimeout(600);
    await page.keyboard.press("KeyM");
    await expect(page.getByTestId("projects-menu")).toBeVisible();
    const frozen = await plane(page);
    await page.waitForTimeout(700);
    const still = await plane(page);
    expect(Math.hypot(still.x - frozen.x, still.y - frozen.y, still.z - frozen.z)).toBeLessThan(0.05);
    await page.keyboard.press("Escape");
    await expect.poll(() => plane(page).then((p) => p.x), { timeout: 10_000 }).toBeGreaterThan(frozen.x + 2);
    await page.getByTestId("reset-car").click();
    await expect.poll(() => vehicle(page).then((v) => v.carForm)).toBe("car");
    const c = await car(page);
    expect(Math.hypot(c.x - 124, c.z - -9)).toBeLessThan(0.5);
    // Quality cycles with the aircraft airborne keep it flying.
    await page.evaluate(() => window.__pauWorld!.teleportPlane(150, 40, -9, Math.PI / 2, true));
    const toggle = page.getByTestId("quality-toggle");
    for (const q of ["high", "medium", "low"]) {
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-quality", q);
    }
    expect((await vehicle(page)).flight).toBe("flying");
    expect((await plane(page)).onGround).toBe(false);
  });
});
