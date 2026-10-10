import { expect, test } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

test.describe("PAU WORLD smoke", () => {
  test("full run: intro → drive → prompt → panel → close → keep driving → menu → route", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pau Ramos", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "View projects" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Focus areas" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Open the 3D city" })).toBeVisible();
    // No WebGL canvas before the visitor asks for it.
    await expect(page.locator("canvas")).toHaveCount(0);

    await startGame(page);
    await expect(page.getByTestId("minimap")).toBeVisible();

    // Drive north into the plaza until the Central Hub prompt appears.
    const startZ = (await car(page)).z;
    const prompt = page.getByTestId("interact-prompt");
    const reached = await holdKeyUntil(page, "KeyW", () => prompt.isVisible());
    expect(reached, "car reached the Central Hub interaction zone by driving").toBe(true);
    await expect(prompt).toContainText("Central Hub");
    expect((await car(page)).z).toBeLessThan(startZ - 5);

    // Open with E; driving must be blocked while the panel is open.
    await page.keyboard.press("KeyE");
    const panel = page.getByTestId("project-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Pau Ramos" })).toBeVisible();
    await expect(page.getByTestId("dialog-close")).toBeFocused();
    const zBefore = (await car(page)).z;
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(600);
    await page.keyboard.up("KeyW");
    expect(Math.abs((await car(page)).z - zBefore)).toBeLessThan(0.5);

    // Close with Escape; the panel was opened from the keyboard (nothing focused), so focus
    // simply leaves the dialog. Restore-to-opener is covered in dialog.spec.ts.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.closest("[role=dialog]") ?? null)).toBeNull();
    const before = await car(page);
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(1200);
    await page.keyboard.up("KeyS");
    const after = await car(page);
    expect(Math.hypot(after.x - before.x, after.z - before.z), "car moves again after closing the panel").toBeGreaterThan(0.5);

    // Projects menu: built and planned groups, every district present, opens an unbuilt one.
    await page.keyboard.press("KeyM");
    const menu = page.getByTestId("projects-menu");
    await expect(menu).toBeVisible();
    await expect(page.getByTestId("menu-built").getByRole("listitem")).toHaveCount(3);
    await expect(page.getByTestId("menu-planned").getByRole("listitem")).toHaveCount(4);
    for (const name of ["Central Hub", "DUPLEX", "OVI", "BROKI", "TrustOS", "42 Madrid", "Contact Station"]) {
      await expect(menu.getByRole("button", { name: new RegExp(`^${name}`) })).toBeVisible();
    }
    await menu.getByRole("button", { name: /^DUPLEX/ }).click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "DUPLEX" })).toBeVisible();
    await expect(panel.getByText("How it works")).toBeVisible();
    await expect(panel.getByText("Pending information")).toHaveCount(0);

    // Mouse path: the footer close button.
    await panel.getByTestId("panel-close").click();
    await expect(panel).toBeHidden();

    // Mouse path: drive back into the zone if the reverse move left it, then click the HUD prompt.
    expect(await holdKeyUntil(page, "KeyW", () => prompt.isVisible())).toBe(true);
    await prompt.click();
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: "Open as page" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Pau Ramos", level: 1 })).toBeVisible();

    expect(errors(), "no console errors during the run").toEqual([]);
  });

  test("reset car puts the car back at the spawn point", async ({ page }) => {
    await startGame(page);
    const spawn = await car(page);
    const movedAway = async () => Math.abs((await car(page)).z - spawn.z) > 3;
    expect(await holdKeyUntil(page, "KeyW", movedAway)).toBe(true);
    await page.keyboard.press("KeyR");
    await expect.poll(async () => Math.abs((await car(page)).z - spawn.z)).toBeLessThan(0.01);
    // The HUD button does the same.
    expect(await holdKeyUntil(page, "KeyW", movedAway)).toBe(true);
    await page.getByTestId("reset-car").click();
    await expect.poll(async () => Math.abs((await car(page)).z - spawn.z)).toBeLessThan(0.01);
  });

  test("HTML routes work without the 3D scene", async ({ page }) => {
    await page.goto("/projects");
    const list = page.getByTestId("projects-list");
    await expect(list.getByRole("link")).toHaveCount(6);
    await page.getByRole("link", { name: /DUPLEX/ }).click();
    await expect(page).toHaveURL(/\/projects\/duplex$/);
    await expect(page.getByRole("heading", { name: "DUPLEX", level: 1 })).toBeVisible();
    await expect(page.getByText("Technical highlights")).toBeVisible();
    await expect(page.getByText("Pending information")).toHaveCount(0);
    await expect(page).toHaveTitle(/DUPLEX · PAU WORLD/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /DUPLEX/);

    await page.goto("/projects/ovi");
    await expect(page.getByRole("heading", { name: "OVI", level: 1 })).toBeVisible();
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/paura432");
    // No CV links while the files are not published.
    await expect(page.getByRole("link", { name: /^CV/ })).toHaveCount(0);
    const missing = await page.goto("/projects/does-not-exist");
    expect(missing?.status()).toBe(404);
    const robots = await page.goto("/robots.txt");
    expect(robots?.status()).toBe(200);
  });

  test("falls back to the HTML portfolio when WebGL is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return (original as (this: HTMLCanvasElement, t: string, ...r: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto("/");
    await expect(page.getByText(/needs WebGL/)).toBeVisible();
    await expect(page.getByTestId("explore")).toHaveCount(0);
    await page.getByRole("link", { name: "View projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });
});
