import { expect, test, type Page } from "@playwright/test";

/** Hold a key until a condition holds (or the timeout passes). */
async function holdKeyUntil(page: Page, key: string, condition: () => Promise<boolean>, timeoutMs = 40_000) {
  await page.keyboard.down(key);
  const start = Date.now();
  try {
    while (Date.now() - start < timeoutMs) {
      if (await condition()) return true;
      await page.waitForTimeout(150);
    }
    return false;
  } finally {
    await page.keyboard.up(key);
  }
}

const carX = (page: Page) => page.evaluate(() => window.__pauWorld?.car().x ?? NaN);
const carZ = (page: Page) => page.evaluate(() => window.__pauWorld?.car().z ?? NaN);

test.describe("PAU WORLD smoke", () => {
  test("full run: intro → drive → prompt → panel → close → keep driving → menu → route", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pau Ramos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View projects" })).toBeVisible();

    await page.getByRole("button", { name: "Explore world" }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await expect.poll(() => page.evaluate(() => typeof window.__pauWorld)).toBe("object");

    // Drive north into the plaza until the Central Hub prompt appears.
    const startZ = await carZ(page);
    const prompt = page.getByTestId("interact-prompt");
    const reached = await holdKeyUntil(page, "KeyW", () => prompt.isVisible());
    expect(reached, "car reached the Central Hub interaction zone by driving").toBe(true);
    await expect(prompt).toContainText("Central Hub");
    expect(await carZ(page)).toBeLessThan(startZ - 5);

    // Open with E; driving must be blocked while the panel is open.
    await page.keyboard.press("KeyE");
    const panel = page.getByTestId("project-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Pau Ramos" })).toBeVisible();
    await expect(panel).toBeFocused();
    const zBefore = await carZ(page);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(600);
    await page.keyboard.up("KeyW");
    expect(Math.abs((await carZ(page)) - zBefore)).toBeLessThan(0.5);

    // Close with Escape and verify control is back.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    const xBefore = await carX(page);
    const zAfterClose = await carZ(page);
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(1200);
    await page.keyboard.up("KeyS");
    const moved = Math.hypot((await carX(page)) - xBefore, (await carZ(page)) - zAfterClose);
    expect(moved, "car moves again after closing the panel").toBeGreaterThan(0.5);

    // Projects menu lists every district and opens an unbuilt one.
    await page.keyboard.press("KeyM");
    const menu = page.getByTestId("projects-menu");
    await expect(menu).toBeVisible();
    for (const name of ["Central Hub", "DUPLEX", "OVI", "BROKI", "TrustOS", "42 Madrid", "Contact Station"]) {
      await expect(menu.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    }
    await menu.getByRole("button", { name: /DUPLEX/ }).click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "DUPLEX" })).toBeVisible();

    // Mouse path: the close button.
    await panel.getByTestId("panel-close").click();
    await expect(panel).toBeHidden();

    // Mouse path: the HUD prompt button opens the panel too.
    await expect(prompt).toBeVisible();
    await prompt.click();
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: "Open as page" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Pau Ramos", level: 1 })).toBeVisible();

    const fatal = errors.filter((e) => !/deprecated|has been removed/i.test(e));
    expect(fatal, "no console errors during the run").toEqual([]);
  });

  test("HTML routes work without the 3D scene", async ({ page }) => {
    await page.goto("/projects");
    const list = page.getByTestId("projects-list");
    await expect(list.getByRole("link")).toHaveCount(6);
    await page.getByRole("link", { name: /DUPLEX/ }).click();
    await expect(page).toHaveURL(/\/projects\/duplex$/);
    await expect(page.getByRole("heading", { name: "DUPLEX", level: 1 })).toBeVisible();
    await expect(page.getByText("Pending information")).toBeVisible();

    await page.goto("/projects/ovi");
    await expect(page.getByRole("heading", { name: "OVI", level: 1 })).toBeVisible();
    await page.goto("/contact");
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/paura432");
    const missing = await page.goto("/projects/does-not-exist");
    expect(missing?.status()).toBe(404);
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
    await expect(page.getByRole("button", { name: "Explore world" })).toHaveCount(0);
    await page.getByRole("link", { name: "View projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });
});
