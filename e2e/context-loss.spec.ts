import { expect, test } from "@playwright/test";
import { startGame } from "./helpers";

test("WebGL context loss shows a recovery overlay and clears when restored", async ({ page }) => {
  await startGame(page);
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_lose_context");
    if (!ext) return false;
    ext.loseContext();
    (window as unknown as { __restore: () => void }).__restore = () => ext.restoreContext();
    return true;
  });
  test.skip(!lost, "WEBGL_lose_context not available in this browser");
  await expect(page.getByTestId("context-lost")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __restore: () => void }).__restore());
  await expect(page.getByTestId("context-lost")).toBeHidden();
  await expect(page.locator("canvas")).toBeVisible();
});
