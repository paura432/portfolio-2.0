// Usage: node .probe/v3shots.mjs <outDir> [baseURL] [--no-medium]
// Captures the 18 V3 QA shots with fixed cameras via window.__pauWorld (photo mode).
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const [out, base = "http://127.0.0.1:3101", ...flags] = process.argv.slice(2);
const noMedium = flags.includes("--no-medium");
mkdirSync(out, { recursive: true });
const args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const browser = await chromium.launch({ args });
const HIDE_HUD = ".pointer-events-none, [role=status] { display: none !important; }";
const stats = {};

async function start(page) {
  await page.goto(base + "/");
  await page.getByRole("button", { name: /explore/i }).click();
  await page.waitForFunction(() => typeof window.__pauWorld === "object");
  await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
  await page.evaluate(() => window.__pauWorld.setQuality("high", true));
  await page.waitForTimeout(600);
}
const photo = (page, position, target, fov = 50) => page.evaluate((c) => window.__pauWorld.photo(c), { position, target, fov });
const shot = async (page, name, ms = 500) => {
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${out}/${name}.png` });
  stats[name] = await page.evaluate(() => window.__pauWorld?.stats?.() ?? null);
  console.log("shot", name);
};
const settle = (page) => page.evaluate(() => window.__pauWorld.photo(null));

// ---------- Desktop ----------
const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await d.goto(base + "/");
await d.waitForTimeout(900);
await d.screenshot({ path: `${out}/01-intro-desktop.png` });
await start(d);
await shot(d, "03-spawn-desktop", 800);

// Studio shots of the car at the spawn (car at 0,27 facing north = -Z).
await d.addStyleTag({ content: HIDE_HUD });
await d.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
await photo(d, [0, 2.6, 34.5], [0, 0.9, 27], 42);
await shot(d, "05-car-rear");
await photo(d, [7.5, 1.9, 27], [0, 0.8, 27], 42);
await shot(d, "06-car-side");
await photo(d, [5.2, 2.8, 32.8], [0, 0.75, 27], 42);
await shot(d, "07-car-three-quarter");
await photo(d, [0.5, 9, 27.5], [0, 0, 27], 42);
await shot(d, "07b-car-top");

// Turning: follow camera, car steering.
await settle(d);
await d.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
await d.waitForTimeout(300);
await d.keyboard.down("KeyW");
await d.waitForTimeout(900);
await d.keyboard.down("KeyA");
await d.waitForTimeout(700);
await d.screenshot({ path: `${out}/08-car-turning.png` });
stats["08-car-turning"] = await d.evaluate(() => window.__pauWorld.stats());
await d.keyboard.up("KeyA");
await d.keyboard.up("KeyW");

// Architecture.
await d.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
await photo(d, [17, 9, 24], [0, 4, 0], 45);
await shot(d, "09-central-hub");
await photo(d, [-12, 8, 10], [-28, 4.5, -17], 45);
await shot(d, "10-duplex");
await photo(d, [12, 9, 10], [28, 6, -17], 45);
await shot(d, "11-ovi");
await photo(d, [0, 92, 72], [0, 0, -4], 50);
await shot(d, "12-aerial");
await photo(d, [28, 7.5, 13], [40, 0, 0], 48);
await shot(d, "13-roads-intersection");
await photo(d, [-7, 2.8, 12.5], [-17.5, 2.6, 5], 42);
await shot(d, "14-signs");

// Night driving: follow camera from spawn, heading to the plaza.
await settle(d);
await d.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
await d.waitForTimeout(200);
await d.keyboard.down("KeyW");
await d.waitForTimeout(1300);
await d.screenshot({ path: `${out}/15-night-driving.png` });
stats["15-night-driving"] = await d.evaluate(() => window.__pauWorld.stats());
await d.keyboard.up("KeyW");

// Quality tiers from one camera.
await d.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
await photo(d, [14, 7, 30], [-2, 3, 4], 45);
for (const q of noMedium ? ["low", "high"] : ["low", "medium", "high"]) {
  await d.evaluate((q) => window.__pauWorld.setQuality(q, true), q);
  await shot(d, `16-quality-${q}`, 900);
}
await d.close();

// ---------- Mobile ----------
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto(base + "/");
await m.waitForTimeout(900);
await m.screenshot({ path: `${out}/02-intro-mobile.png` });
await start(m);
await shot(m, "04-spawn-mobile", 800);
await m.close();

await browser.close();
writeFileSync(`${out}/stats.json`, JSON.stringify(stats, null, 2));
console.log("captured to", out);
