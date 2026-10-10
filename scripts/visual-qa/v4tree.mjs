// Usage: node scripts/visual-qa/v4tree.mjs <outDir> [base] [--mode soft|medium|strong] [--quality high|medium|low] [--video]
// Drives the car for real (held W key) into the boulevard tree nearest to the spawn and
// captures the sequence with the follow camera; prints the tree state timeline.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const outDir = args[0] ?? "docs/screenshots/v4/tree";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const mode = opt("--mode", "strong");
const quality = opt("--quality", "high");
const video = args.includes("--video");
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...(video ? { recordVideo: { dir: outDir, size: { width: 1280, height: 800 } } } : {}) });
const page = await context.newPage();
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate((q) => window.__pauWorld.setQuality(q, true), quality);
// Target: the tree closest to the spawn's east sidewalk.
const tree = await page.evaluate(() => window.__pauWorld.trees.nearest(7.3, 24));
// Approach from the south along +X? No: approach straight along -Z so the fall direction is readable.
const runUp = { soft: 2.6, medium: 7, strong: 20 }[mode];
const startZ = tree.z + runUp;
await page.evaluate(([x, z]) => window.__pauWorld.teleport(x, z, Math.PI), [tree.x, startZ]);
await page.waitForTimeout(700);
const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png` });
const state = () => page.evaluate((id) => ({ ...window.__pauWorld.trees.state(id), car: window.__pauWorld.car() }), tree.id);
await shot(`${mode}-00-intact`);
const timeline = [];
const t0 = Date.now();
await page.keyboard.down("KeyW");
let released = false;
let i = 1;
while (Date.now() - t0 < 6500) {
  const s = await state();
  timeline.push({ t: +((Date.now() - t0) / 1000).toFixed(2), phase: s.phase, angle: +s.angle.toFixed(3), broken: s.broken, impact: +s.impact.toFixed(2), speed: +s.car.speed.toFixed(2), z: +s.car.z.toFixed(2) });
  if (!released && s.phase !== "standing") {
    // Keep driving briefly so the car visibly passes, then stop.
    await page.waitForTimeout(mode === "soft" ? 0 : 250);
    await page.keyboard.up("KeyW");
    released = true;
  }
  if (s.phase !== "standing" || i % 4 === 0) await shot(`${mode}-${String(i).padStart(2, "0")}-${s.phase}`);
  i++;
  await page.waitForTimeout(220);
}
if (!released) await page.keyboard.up("KeyW");
await shot(`${mode}-99-end`);
const summary = await page.evaluate(() => ({ summary: window.__pauWorld.trees.summary(), stats: window.__pauWorld.stats() }));
console.log(JSON.stringify({ mode, quality, tree, timeline, ...summary }, null, 1));
await context.close();
await browser.close();
