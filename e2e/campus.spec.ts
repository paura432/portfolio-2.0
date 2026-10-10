import { expect, test } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

const VERIFIED = ["https://github.com/paura432/Back-office", "https://github.com/paura432/ai-eng-financial-dashboard-context-project"];

test.describe("4Geeks AI Engineering Campus", () => {
  test("drive to the campus, open it, navigate the labs, close and keep driving", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    // 1–2. The district is on the minimap (main plot + four lab plots).
    const plots = page.getByTestId("minimap").locator("[data-district=fourgeeks] rect");
    await expect(plots).toHaveCount(5);

    // 3–5. From the north ring road the spur leads to the entrance: hold W until the campus prompt appears.
    await page.evaluate(() => window.__pauWorld!.teleport(30, -37, Math.PI));
    const prompt = page.getByTestId("interact-prompt");
    const reached = await holdKeyUntil(page, "KeyW", () => prompt.isVisible());
    expect(reached, "car reached the campus entrance by driving").toBe(true);
    await expect(prompt).toContainText("Explore");
    await expect(prompt).toContainText("4Geeks AI Campus");
    const c = await car(page);
    expect(c.z).toBeLessThan(-42);
    // 6. The spur is drivable and the hall blocks: push on and the car stops before the facade (z = -52 minus padding and radius).
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1500);
    await page.keyboard.up("KeyW");
    expect((await car(page)).z).toBeGreaterThan(-52 + 1 + 1.3 - 0.01);

    // 7–9. E opens the campus panel and pauses driving.
    await page.evaluate(() => window.__pauWorld!.teleport(30, -46.5, Math.PI));
    await expect(prompt).toBeVisible();
    await page.keyboard.press("KeyE");
    const panel = page.getByTestId("project-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "4Geeks AI Engineering Campus" })).toBeVisible();
    await expect(page.getByTestId("campus-labs").getByRole("listitem")).toHaveCount(4);
    await expect(panel.getByText("Not to be confused with 42 Madrid")).toBeVisible();
    const zBefore = (await car(page)).z;
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(500);
    await page.keyboard.up("KeyW");
    expect(Math.abs((await car(page)).z - zBefore)).toBeLessThan(0.5);

    // 10–11. Lab navigation inside the panel; every repository link is a verified one.
    await page.getByTestId("campus-lab-trackflow").click();
    await expect(page.getByTestId("lab-trackflow")).toBeVisible();
    await expect(panel.getByRole("heading", { name: "TrackFlow" })).toBeVisible();
    await expect(panel.getByText("What exists in the repository")).toBeVisible();
    const repo = page.getByTestId("lab-repo-trackflow");
    expect(VERIFIED).toContain(await repo.getAttribute("href"));
    await expect(panel.locator("[data-status]")).toHaveAttribute("data-status", "implemented");
    await page.getByTestId("lab-back").click();
    await expect(page.getByTestId("campus-content")).toBeVisible();
    for (const slug of ["financial-dashboard", "back-office", "ai-workflow"]) {
      await page.getByTestId(`campus-lab-${slug}`).click();
      await expect(page.getByTestId(`lab-${slug}`)).toBeVisible();
      expect(VERIFIED).toContain(await page.getByTestId(`lab-repo-${slug}`).getAttribute("href"));
      await page.getByTestId("lab-back").click();
    }

    // 12–13. Close; driving resumes.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    const before = await car(page);
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(1200);
    await page.keyboard.up("KeyS");
    expect(Math.hypot((await car(page)).x - before.x, (await car(page)).z - before.z)).toBeGreaterThan(0.5);

    // Secondary zone: standing in front of Lab 01 on the plaza opens that lab directly.
    await page.evaluate(() => window.__pauWorld!.teleport(15, -48.5, Math.PI));
    await expect(prompt).toHaveAttribute("data-lab", "trackflow");
    await expect(prompt).toContainText("Lab 01");
    await page.keyboard.press("KeyE");
    await expect(page.getByTestId("lab-trackflow")).toBeVisible();
    await page.keyboard.press("Escape");

    // 16. LOW keeps the content and the interaction.
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    await page.evaluate(() => window.__pauWorld!.teleport(30, -46.5, Math.PI));
    await expect(prompt).toContainText("4Geeks AI Campus");
    await page.keyboard.press("KeyE");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");

    // 19. V4 trees still simulate and none stands inside the campus.
    const summary = await page.evaluate(() => window.__pauWorld!.trees.summary());
    expect(summary.active).toBeGreaterThan(70);
    expect(errors()).toEqual([]);
  });

  test("HTML routes of the campus work without WebGL", async ({ page }) => {
    await page.goto("/education/4geeks");
    await expect(page.getByRole("heading", { name: "4Geeks AI Engineering Campus", level: 1 })).toBeVisible();
    await expect(page.getByTestId("campus-labs").getByRole("link")).toHaveCount(4);
    await expect(page).toHaveTitle(/4Geeks AI Engineering Campus/);
    await page.getByTestId("campus-lab-back-office").click();
    await expect(page).toHaveURL(/\/education\/4geeks\/back-office$/);
    await expect(page.getByRole("heading", { name: "Back-office", level: 1 })).toBeVisible();
    await expect(page.getByText("Evidence")).toBeVisible();
    expect(VERIFIED).toContain(await page.getByTestId("lab-repo-back-office").getAttribute("href"));
    await page.getByRole("link", { name: /Back to the campus/ }).click();
    await expect(page).toHaveURL(/\/education\/4geeks$/);
    const missing = await page.goto("/education/4geeks/does-not-exist");
    expect(missing?.status()).toBe(404);
    // The campus is listed with the districts and can be reached from the menu without driving.
    await page.goto("/projects");
    await expect(page.getByTestId("projects-list").getByRole("link", { name: /4Geeks AI Campus/ })).toBeVisible();
    await startGame(page);
    await page.keyboard.press("KeyM");
    await page.getByTestId("projects-menu").getByRole("button", { name: /^4Geeks AI Campus/ }).click();
    await expect(page.getByTestId("campus-content")).toBeVisible();
  });
});
