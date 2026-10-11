import { expect, test } from "@playwright/test";

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "no horizontal overflow").toBeLessThanOrEqual(1);
}

test.describe("mobile viewport", () => {
  test("intro fits a phone in portrait and landscape", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pau Ramos", level: 1 })).toBeVisible();
    await expect(page.getByTestId("explore")).toBeVisible();
    await noHorizontalScroll(page);
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(page.getByTestId("explore")).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("game shows touch controls and the panel is a full-width sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("explore").tap();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByTestId("loading")).toBeHidden();
    await expect(page.getByTestId("touch-controls")).toBeVisible();
    await expect(page.getByTestId("minimap")).toBeVisible();
    await noHorizontalScroll(page);

    // Hold the accelerate button: the car must move.
    const before = await page.evaluate(() => window.__pauWorld?.car().z ?? NaN);
    const accel = page.getByRole("button", { name: "Accelerate" });
    const box = (await accel.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); // tap registers pointerdown/up
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2500); // under 2 fps (SwiftShader, V7 scene) the clamped physics step needs the longer hold
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.__pauWorld?.car().z ?? NaN)).toBeLessThan(before - 1);

    await page.getByTestId("open-menu").tap();
    const dialog = page.getByTestId("projects-menu");
    await expect(dialog).toBeVisible();
    const dBox = (await dialog.boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(dBox.width, "dialog spans the full width on phones").toBeGreaterThanOrEqual(vw - 2);
    await dialog.getByRole("button", { name: /^OVI/ }).tap();
    const panel = page.getByTestId("project-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "OVI" })).toBeVisible();
    // Sticky header stays visible after scrolling the body.
    await panel.locator(".dialog-body").evaluate((el) => el.scrollTo(0, 2000));
    await expect(page.getByTestId("dialog-close")).toBeInViewport();
    await page.getByTestId("dialog-close").tap();
    await expect(panel).toBeHidden();

    // Landscape: HUD and controls still fit.
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(page.getByTestId("touch-controls")).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("campus prompt and panel work with touch", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("explore").tap();
    await expect(page.getByTestId("loading")).toBeHidden();
    await expect.poll(() => page.evaluate(() => typeof window.__pauWorld)).toBe("object");
    await page.evaluate(() => window.__pauWorld!.teleport(30, -46.5, Math.PI));
    const prompt = page.getByTestId("interact-prompt");
    await expect(prompt).toContainText("4Geeks AI Campus");
    await prompt.tap();
    const panel = page.getByTestId("project-panel");
    await expect(panel).toBeVisible();
    await page.getByTestId("campus-lab-ai-workflow").tap();
    await expect(page.getByTestId("lab-ai-workflow")).toBeVisible();
    await page.getByTestId("lab-back").tap();
    await expect(page.getByTestId("campus-content")).toBeVisible();
    await page.getByTestId("dialog-close").tap();
    await expect(panel).toBeHidden();
    await noHorizontalScroll(page);
  });

  test("reduced motion disables intro animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const duration = await page.locator(".rise").first().evaluate((el) => getComputedStyle(el).animationDuration);
    expect(duration).toBe("0s");
  });
});
