// Usage: node scripts/visual-qa/v4sequence.mjs <outDir> [base] [--mode soft|medium|strong] [--quality high|medium|low] [--video] [--reduced]
// Real-driving impact sequence from a fixed side camera: intact → impact → falling → fallen → reset → regrow.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const outDir = args[0] ?? "docs/screenshots/v4/sequence";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const mode = opt("--mode", "strong");
const quality = opt("--quality", "high");
const video = args.includes("--video");
// Software rendering runs at 1–4 fps: slow the tree clock so the fall spans several frames (capture only).
const slow = Number(opt("--slow", "1"));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({
  viewport: { width: 1120, height: 700 },
  reducedMotion: args.includes("--reduced") ? "reduce" : "no-preference",
  ...(video ? { recordVideo: { dir: outDir, size: { width: 1120, height: 700 } } } : {}),
});
const page = await context.newPage();
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate((q) => window.__pauWorld.setQuality(q, true), quality);
// Target: a boulevard tree beside the south road (open ground, readable from the road side).
const tree = await page.evaluate(() => window.__pauWorld.trees.nearest(-7.3, 29));
// Start points chosen so the contact speed lands in each band (v ≈ sqrt(2·16·runUp)): soft ≈ 4.4, medium ≈ 11, strong ≈ 20.
const start = { soft: [-5.0, 27.8], medium: [-2.8, 25.0], strong: [2.0, 18.0] }[mode];
const vx = tree.x - start[0];
const vz = tree.z - start[1];
const len = Math.hypot(vx, vz);
const u = [vx / len, vz / len];
const heading = Math.atan2(u[0], u[1]);
await page.evaluate(([x, z, h]) => window.__pauWorld.teleport(x, z, h), [start[0], start[1], heading]);
// Side camera perpendicular to the approach, slightly behind the trunk, looking at it.
const side = [u[1], -u[0]];
await page.evaluate(
  ([x, z, tx, tz]) => window.__pauWorld.photo({ position: [x, 3.6, z], target: [tx, 1.7, tz], fov: 44 }),
  [tree.x + side[0] * 8.5 - u[0] * 2.5, tree.z + side[1] * 8.5 - u[1] * 2.5, tree.x + u[0] * 1.2, tree.z + u[1] * 1.2],
);
await page.evaluate((k) => window.__pauWorld.trees.timeScale(k), slow);
await page.waitForTimeout(600);
let n = 0;
const shot = async (label) => page.screenshot({ path: `${outDir}/${mode}-${String(n++).padStart(2, "0")}-${label}.jpg`, type: "jpeg", quality: 82 });
const state = () => page.evaluate((id) => ({ ...window.__pauWorld.trees.state(id), car: window.__pauWorld.car() }), tree.id);
const timeline = [];
const log = (t, s, note = "") => timeline.push({ t: +t.toFixed(2), phase: s.phase, angle: +s.angle.toFixed(2), tilt: undefined, broken: s.broken, impact: +s.impact.toFixed(1), speed: +s.car.speed.toFixed(1), note });
await shot("intact");
const t0 = Date.now();
await page.keyboard.down("KeyW");
let lastPhase = "standing";
let lastAngle = 0;
let released = false;
while (Date.now() - t0 < 14000) {
  const s = await state();
  const t = (Date.now() - t0) / 1000;
  if (!released && s.phase !== "standing") {
    if (mode !== "soft") await page.waitForTimeout(150);
    await page.keyboard.up("KeyW");
    released = true;
    log(t, s, "impact");
  }
  if (s.phase !== lastPhase || Math.abs(s.angle - lastAngle) >= 0.3) {
    await shot(s.phase);
    log(t, s, "shot");
    lastPhase = s.phase;
    lastAngle = s.angle;
  }
  if (s.phase === "fallen" || (mode === "soft" && released && s.phase === "standing")) break;
  await page.waitForTimeout(60);
}
await page.evaluate(() => window.__pauWorld.trees.timeScale(1));
if (!released) await page.keyboard.up("KeyW");
await page.waitForTimeout(400);
let s = await state();
log((Date.now() - t0) / 1000, s, "rest");
await shot(s.phase === "fallen" ? "fallen-rest" : s.phase);
if (s.phase === "fallen") {
  // Manual reset after driving away (a tree never regrows under the car).
  await page.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
  await page.evaluate(() => window.__pauWorld.trees.reset());
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(120);
    s = await state();
    if (s.phase === "respawning" && i % 2 === 0) await shot("respawning");
    if (s.phase === "standing") break;
  }
  s = await state();
  log((Date.now() - t0) / 1000, s, "restored");
  await shot("restored");
}
const summary = await page.evaluate(() => ({ summary: window.__pauWorld.trees.summary(), stats: window.__pauWorld.stats() }));
console.log(JSON.stringify({ mode, quality, tree: { id: tree.id, kind: tree.kind, x: +tree.x.toFixed(2), z: +tree.z.toFixed(2), scale: +tree.scale.toFixed(2) }, timeline, ...summary }));
await context.close();
await browser.close();
