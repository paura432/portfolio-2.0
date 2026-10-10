import { expect, test } from "@playwright/test";
import { startGame } from "./helpers";

test.describe("dialog focus cycle", () => {
  test("focus enters, cycles with Tab and Shift+Tab, never leaves, and returns on close", async ({ page }) => {
    await startGame(page);
    const opener = page.getByTestId("open-menu");
    await opener.click();
    const dialog = page.getByTestId("projects-menu");
    await expect(dialog).toBeVisible();

    // Initial focus: the close button in the sticky header.
    const close = page.getByTestId("dialog-close");
    await expect(close).toBeFocused();

    // Shift+Tab from the first focusable wraps to the last one inside the dialog.
    await page.keyboard.press("Shift+Tab");
    const last = page.locator(":focus");
    await expect(last).toBeVisible();
    expect(await dialog.evaluate((d, el) => d.contains(el), await last.elementHandle())).toBe(true);
    await expect(last).toHaveAttribute("aria-label", /Contact Station: open as page/);

    // Tab from the last wraps back to the first.
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();

    // Walk the whole ring forward: every stop stays inside the dialog.
    const count = await dialog.locator('a[href], button:not([disabled])').count();
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => {
        const d = document.querySelector('[data-testid="projects-menu"]');
        return !!d && d.contains(document.activeElement);
      });
      expect(inside, `focus stayed inside after ${i + 1} tabs`).toBe(true);
    }

    // The HUD behind the dialog is inert.
    expect(await page.getByTestId("open-menu").evaluate((el) => el.closest("[inert]") !== null)).toBe(true);

    // Escape closes and focus returns to the opener.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("backdrop click closes, clicks inside do not", async ({ page }) => {
    await startGame(page);
    await page.keyboard.press("KeyM");
    const dialog = page.getByTestId("projects-menu");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("heading", { name: "Districts" }).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });
});
