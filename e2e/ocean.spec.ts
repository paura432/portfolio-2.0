import { expect, test, type Page } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

/**
 * V6 ocean expansion, played for real: drive onto the quay, stop, board with
 * E, sail (keys held, steering corrected from the probe like a player would)
 * to the second island, brake, dock, explore the point of interest, cast off,
 * sail home, dock and drive the car again. Teleports only stage the car on
 * the harbor road; every transition and crossing below is real.
 */
const boat = (page: Page) => page.evaluate(() => window.__pauWorld!.boat());
const vehicle = (page: Page) => page.evaluate(() => window.__pauWorld!.vehicle());

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Hold W and steer with A/D toward a target until within `radius` of it. */
async function sailTo(page: Page, target: [number, number], radius: number, timeoutMs = 120_000): Promise<boolean> {
  const start = Date.now();
  let steering: "KeyA" | "KeyD" | null = null;
  await page.keyboard.down("KeyW");
  try {
    while (Date.now() - start < timeoutMs) {
      const b = await boat(page);
      if (Math.hypot(target[0] - b.x, target[1] - b.z) < radius) return true;
      const want = Math.atan2(target[0] - b.x, target[1] - b.z);
      const err = wrap(want - b.heading);
      // Steering right (D) decreases the heading, so a positive error needs A.
      const next: "KeyA" | "KeyD" | null = Math.abs(err) < 0.07 ? null : err > 0 ? "KeyA" : "KeyD";
      if (next !== steering) {
        if (steering) await page.keyboard.up(steering);
        if (next) await page.keyboard.down(next);
        steering = next;
      }
      await page.waitForTimeout(120);
    }
    return false;
  } finally {
    if (steering) await page.keyboard.up(steering);
    await page.keyboard.up("KeyW");
  }
}

async function brakeUntilSlow(page: Page, maxSpeed: number) {
  expect(await holdKeyUntil(page, "Space", async () => (await boat(page)).speed <= maxSpeed, 30_000)).toBe(true);
}

test.describe("ocean expansion", () => {
  test.setTimeout(420_000);

  test("car → harbor → boat → second island → explore → back → car", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    expect((await vehicle(page)).active).toBe("car");
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "city");

    // 1–3. Stage the car on the harbor road, then drive west onto the quay for real.
    await page.evaluate(() => window.__pauWorld!.teleport(-46, 0, -Math.PI / 2));
    const atHarbor = await holdKeyUntil(page, "KeyW", async () => (await vehicle(page)).nearbyHarbor === "pau-harbor", 40_000);
    expect(atHarbor, "the car reached the boarding zone by driving").toBe(true);
    expect((await vehicle(page)).mode).toBe("approaching-dock");
    const prompt = page.getByTestId("vehicle-prompt");
    // 4. Stop: the prompt only appears once the car is slow (never on a drive-through).
    expect(await holdKeyUntil(page, "Space", async () => Math.abs((await car(page)).speed) < 1, 15_000)).toBe(true);
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveAttribute("data-action", "board");
    const parked = await car(page);

    // 5–6. Board with E: a transition, then the boat is the active vehicle. The car has not moved.
    await page.keyboard.press("KeyE");
    await expect.poll(() => vehicle(page).then((v) => v.mode)).toBe("boarding");
    await expect.poll(() => vehicle(page).then((v) => v.active), { timeout: 15_000 }).toBe("boat");
    await expect.poll(() => vehicle(page).then((v) => v.transition)).toBeNull();
    await expect(page.getByTestId("mode-badge")).toBeVisible();
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "sea");
    await expect(page.getByTestId("reset-world")).toHaveCount(0);
    const b0 = await boat(page);
    // While the boat is being driven, car input does nothing to the car.
    expect(Math.hypot((await car(page)).x - parked.x, (await car(page)).z - parked.z)).toBeLessThan(0.01);

    // 7–8. Accelerate: the hull moves west, floats on the water and leaves the harbor.
    await page.keyboard.down("KeyW");
    await expect.poll(() => boat(page).then((b) => b.x), { timeout: 20_000 }).toBeLessThan(b0.x - 4);
    const b1 = await boat(page);
    await page.keyboard.up("KeyW");
    expect(b1.speed).toBeGreaterThan(2);
    const water = await page.evaluate(({ x, z }) => window.__pauWorld!.water(x, z), { x: b1.x, z: b1.z });
    expect(Math.abs(b1.y - water)).toBeLessThan(0.6);
    // Inertia: it keeps gliding with the throttle released.
    await page.waitForTimeout(600);
    expect((await boat(page)).speed).toBeGreaterThan(0.5);

    // 9–11. Sail to the Creative Lab docking zone, brake, dock.
    expect(await sailTo(page, [-144, 37], 5)).toBe(true);
    await brakeUntilSlow(page, 3);
    await expect.poll(() => vehicle(page).then((v) => v.nearbyDock), { timeout: 10_000 }).toBe("creative-lab-pier");
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveAttribute("data-action", "dock");
    await page.keyboard.press("KeyE");
    await expect.poll(() => vehicle(page).then((v) => v.mooredAt), { timeout: 15_000 }).toBe("creative-lab-pier");
    // Moored: no land vehicle here, the car is still parked at PAU Harbor.
    expect((await vehicle(page)).active).toBe("boat");
    expect(Math.hypot((await car(page)).x - parked.x, (await car(page)).z - parked.z)).toBeLessThan(0.01);
    await page.keyboard.down("KeyA");
    await page.waitForTimeout(500);
    await page.keyboard.up("KeyA");
    const moored = await boat(page);

    // 12–14. Explore the point of interest and close it.
    const explore = page.getByTestId("interact-prompt");
    await expect(explore).toContainText("Creative Lab");
    await page.keyboard.press("KeyE");
    const poi = page.getByTestId("poi-panel");
    await expect(poi).toBeVisible();
    await expect(poi).toContainText("content pending");
    await page.keyboard.press("Escape");
    await expect(poi).toBeHidden();
    expect((await vehicle(page)).mooredAt).toBe("creative-lab-pier");
    expect(Math.hypot((await boat(page)).x - moored.x, (await boat(page)).z - moored.z)).toBeLessThan(0.5);

    // 15. Back to the boat: throttle casts off.
    await page.keyboard.down("KeyW");
    await expect.poll(() => vehicle(page).then((v) => v.mooredAt), { timeout: 10_000 }).toBeNull();
    await page.keyboard.up("KeyW");

    // 16–17. Sail home, dock, and the parked car takes the controls back.
    expect(await sailTo(page, [-90, 8], 5)).toBe(true);
    await brakeUntilSlow(page, 3);
    await expect.poll(() => vehicle(page).then((v) => v.nearbyDock), { timeout: 10_000 }).toBe("pau-harbor");
    await expect(prompt).toHaveAttribute("data-action", "drive");
    await page.keyboard.press("KeyE");
    await expect.poll(() => vehicle(page).then((v) => v.mode)).toBe("disembarking");
    await expect.poll(() => vehicle(page).then((v) => v.active), { timeout: 15_000 }).toBe("car");
    await expect(page.getByTestId("minimap")).toHaveAttribute("data-mode", "city");
    expect(Math.hypot((await car(page)).x - parked.x, (await car(page)).z - parked.z)).toBeLessThan(0.01);

    // 18. Keep driving: reverse off the quay toward the city.
    expect(await holdKeyUntil(page, "KeyS", async () => (await car(page)).x > parked.x + 2, 20_000)).toBe(true);
    expect(errors(), "no console errors during the voyage").toEqual([]);
  });

  test("no accidental boarding at speed, panels pause the boat, reset recovers mid-transition", async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Drive through the boarding zone fast and press E the very frame the zone activates: nothing happens.
    await page.evaluate(() => window.__pauWorld!.teleport(-40, 0, -Math.PI / 2));
    await page.keyboard.down("KeyW");
    const fast = await page.evaluate(
      () =>
        new Promise<{ speed: number; transition: string | null; prompt: number }>((resolve) => {
          const tick = () => {
            const v = window.__pauWorld!.vehicle();
            const c = window.__pauWorld!.car();
            if (v.nearbyHarbor && Math.abs(c.speed) > 6) {
              window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }));
              window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE", bubbles: true }));
              resolve({ speed: c.speed, transition: window.__pauWorld!.vehicle().transition, prompt: document.querySelectorAll("[data-testid=vehicle-prompt]").length });
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        }),
    );
    await page.keyboard.up("KeyW");
    expect(Math.abs(fast.speed)).toBeGreaterThan(6);
    expect(fast.transition, "E at speed does not board").toBeNull();
    expect(fast.prompt, "no boarding prompt at speed").toBe(0);
    expect((await vehicle(page)).active).toBe("car");
    await expect(page.getByTestId("project-panel")).toHaveCount(0);

    // Board properly, then open the menu while sailing: the boat stops dead and resumes after.
    await expect.poll(() => car(page).then((c) => Math.abs(c.speed)), { timeout: 10_000 }).toBeLessThan(1);
    await page.keyboard.press("KeyE");
    await expect.poll(() => vehicle(page).then((v) => v.active), { timeout: 15_000 }).toBe("boat");
    await page.keyboard.down("KeyW");
    await expect.poll(() => boat(page).then((b) => b.speed), { timeout: 15_000 }).toBeGreaterThan(2);
    await page.keyboard.press("KeyM");
    await expect(page.getByTestId("projects-menu")).toBeVisible();
    await page.keyboard.up("KeyW");
    const paused = await boat(page);
    await page.waitForTimeout(600);
    const still = await boat(page);
    expect(Math.hypot(still.x - paused.x, still.z - paused.z)).toBeLessThan(0.05);
    expect(still.speed).toBe(0);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("projects-menu")).toBeHidden();
    expect((await vehicle(page)).active).toBe("boat");

    // Reset the boat: back at the nearest mooring, still the active vehicle, controllable.
    await page.getByTestId("reset-car").click();
    await expect.poll(() => boat(page).then((b) => b.speed)).toBe(0);
    const v = await vehicle(page);
    expect(v.active).toBe("boat");
    expect(v.transition).toBeNull();
    const r = await boat(page);
    // Nearest mooring from the harbor mouth is PAU Harbor's: alongside the pier, west of the quay.
    expect(r.x).toBeLessThan(-80);
    expect(r.x).toBeGreaterThan(-95);
    expect(Math.abs(r.z)).toBeLessThan(10);
    // Quality cycles while sailing keep the boat where it is.
    const toggle = page.getByTestId("quality-toggle");
    // The test pinned "low" at the start, so the HUD cycle runs low → high → medium → low.
    for (const q of ["high", "medium", "low"]) {
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-quality", q);
    }
    expect((await vehicle(page)).active).toBe("boat");
    expect(Math.hypot((await boat(page)).x - r.x, (await boat(page)).z - r.z)).toBeLessThan(0.1);
  });
});
