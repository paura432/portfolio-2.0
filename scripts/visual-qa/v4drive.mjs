// Usage: node scripts/visual-qa/v4drive.mjs <outDir> [base] [--quality high|medium|low]
// Driving feedback: hard brake on asphalt (skid marks + brake lights), off-road dust, canopy sway near the car.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const outDir = args[0] ?? "docs/screenshots/v4/driving";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const quality = opt("--quality", "high");
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1120, height: 700 } });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate((q) => window.__pauWorld.setQuality(q, true), quality);
const shot = (name) => page.screenshot({ path: `${outDir}/${quality}-${name}.jpg`, type: "jpeg", quality: 82 });
const stats = () => page.evaluate(() => window.__pauWorld.stats());
const out = { quality };

// 1. Hard brake on the south road.
await page.evaluate(() => window.__pauWorld.teleport(0, 36, Math.PI));
await page.waitForTimeout(500);
await page.keyboard.down("KeyW");
await page.waitForTimeout(2600);
await page.keyboard.down("Space");
await page.waitForTimeout(500);
await shot("01-hard-brake");
await page.keyboard.up("Space");
await page.keyboard.up("KeyW");
await page.waitForTimeout(400);
await page.evaluate(([x, z]) => window.__pauWorld.photo({ position: [x + 6, 3.2, z + 7], target: [x, 0.4, z - 2], fov: 46 }), [0, (await page.evaluate(() => window.__pauWorld.car())).z]);
await page.waitForTimeout(500);
await shot("02-skid-marks");
await page.evaluate(() => window.__pauWorld.photo(null));

// 2. Fast turn on the ring road.
await page.evaluate(() => window.__pauWorld.teleport(-30, -40, Math.PI / 2));
await page.waitForTimeout(400);
await page.keyboard.down("KeyW");
await page.waitForTimeout(2600);
await page.keyboard.down("KeyA");
await page.waitForTimeout(900);
await shot("03-fast-turn");
await page.keyboard.up("KeyA");
await page.keyboard.up("KeyW");

// 3. Off-road dust on turf.
await page.evaluate(() => window.__pauWorld.teleport(-22, 24, -Math.PI / 2));
await page.waitForTimeout(400);
await page.keyboard.down("KeyW");
await page.waitForTimeout(2200);
await shot("04-offroad-dust");
out.dustStats = await stats();
await page.keyboard.up("KeyW");

// 4. Canopy sway: two frames one second apart from the same camera next to a boulevard tree.
const tree = await page.evaluate(() => window.__pauWorld.trees.nearest(-7.3, 29));
await page.evaluate(([x, z]) => window.__pauWorld.teleport(x + 3.2, z + 1, Math.PI), [tree.x, tree.z]);
await page.evaluate(([x, z]) => window.__pauWorld.photo({ position: [x + 7, 4.0, z + 6], target: [x, 2.4, z], fov: 40 }), [tree.x, tree.z]);
await page.waitForTimeout(600);
await shot("05-sway-a");
await page.waitForTimeout(900);
await shot("05-sway-b");
await page.evaluate(() => window.__pauWorld.photo(null));
out.stats = await stats();
console.log(JSON.stringify(out));
await browser.close();
