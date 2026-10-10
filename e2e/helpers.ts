import { expect, type Page } from "@playwright/test";

/** Hold a key until a condition holds (or the timeout passes). */
export async function holdKeyUntil(page: Page, key: string, condition: () => Promise<boolean>, timeoutMs = 40_000) {
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

export const car = (page: Page) => page.evaluate(() => window.__pauWorld?.car() ?? { x: NaN, z: NaN, speed: NaN });

export async function startGame(page: Page) {
  await page.goto("/");
  await page.getByTestId("explore").click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("loading")).toBeHidden();
  await expect.poll(() => page.evaluate(() => typeof window.__pauWorld)).toBe("object");
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return () => errors.filter((e) => !/deprecated|has been removed/i.test(e));
}
