// Usage: node scripts/visual-qa/v5shots.mjs <outDir> [base] [--quality high|medium|low] [--mobile] [--only name,name]
// V5 campus QA: aerial, access (follow camera at the spur end), hall, plaza, each lab, open panel, lab panel, menu.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const out = args[0] ?? "docs/screenshots/v5";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const quality = opt("--quality", "high");
const only = opt("--only", "").split(",").filter(Boolean);
const mobile = args.includes("--mobile");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext(mobile ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate((q) => window.__pauWorld.setQuality(q, true), quality);
const prefix = `${mobile ? "mobile-" : ""}${quality}`;
const stats = {};
const shot = async (name, ms = 600) => {
  if (only.length && !only.includes(name)) return;
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
  stats[name] = await page.evaluate(() => window.__pauWorld.stats());
  console.log("shot", name);
};
const photo = (position, target, fov = 48) => page.evaluate((c) => window.__pauWorld.photo(c), { position, target, fov });
const follow = () => page.evaluate(() => window.__pauWorld.photo(null));

// Aerial of the whole island (same camera as the V3 set) and of the campus
await photo([0, 150, 110], [0, 0, -6], 52);
await shot("01-aerial-island", 900);
await photo([36, 42, -18], [34, 2, -55], 46);
await shot("02-aerial-campus", 800);
// Access: follow camera, car at the spur end facing the hall
await follow();
await page.evaluate(() => window.__pauWorld.teleport(30, -44, Math.PI));
await shot("03-access-follow", 900);
await photo([30, 4.5, -41], [30, 4, -56], 50);
await shot("04-hall-front", 700);
await photo([20, 3.4, -43.5], [31, 3.0, -53], 52);
await shot("05-plaza", 700);
await photo([23, 3.6, -45.5], [15, 2.4, -56], 50);
await shot("06-lab01-trackflow", 700);
await photo([38, 3.4, -46], [44, 2.5, -56], 50);
await shot("07-lab02-financial", 700);
await photo([46.5, 3.4, -56.5], [58, 2.4, -58.2], 50);
await shot("08-lab03-backoffice", 700);
await photo([47, 3.0, -49.5], [58, 2.2, -49], 50);
await shot("09-lab04-workflow", 700);
await photo([62, 18, -36], [30, 2, -56], 46);
await shot("10-campus-east-aerial", 800);
// Interaction: drive into the zone and open the panel
await follow();
await page.evaluate(() => window.__pauWorld.teleport(30, -46.5, Math.PI));
await page.waitForTimeout(600);
await page.getByTestId("interact-prompt").waitFor({ timeout: 5000 });
await shot("11-prompt", 300);
await page.keyboard.press("KeyE");
await page.getByTestId("project-panel").waitFor();
await shot("12-panel-campus", 500);
await page.getByTestId("campus-lab-trackflow").click();
await page.getByTestId("lab-trackflow").waitFor();
await shot("13-panel-lab01", 500);
await page.keyboard.press("Escape");
await page.keyboard.press("KeyM");
await page.getByTestId("projects-menu").waitFor();
await shot("14-menu", 500);
await page.keyboard.press("Escape");
writeFileSync(`${out}/${prefix}-stats.json`, JSON.stringify(stats, null, 1));
await browser.close();
