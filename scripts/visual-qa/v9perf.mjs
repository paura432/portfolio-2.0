// Usage: node scripts/visual-qa/v9perf.mjs [base] [--label name]
// V9 performance scenarios (SwiftShader: relative numbers only):
//  1 city driving north from the spawn (3 tiers, comparable with the V4–V8 "city" scenario)
//  2 plaza at rest with every lamp, planter and bench intact (3 tiers)
//  3 furniture knock loop: six lamps and the plaza furniture knocked over for real, counters before / during / after
//  4 reset world after the loop: counters back
//  5 collider overlay on (debug tooling cost, HIGH only)
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const label = opt("--label", "v9");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const t0 = Date.now();
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
const t1 = Date.now();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
const out = { label, gpu: await page.evaluate(() => { const c = document.createElement("canvas"); const gl = c.getContext("webgl2") || c.getContext("webgl"); const d = gl.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "unknown"; }), firstFrameMs: Date.now() - t1, introMs: t1 - t0, scenarios: {} };
const stats = () => page.evaluate(() => window.__pauWorld.stats());
const fps = (ms) => page.evaluate((ms) => window.__pauWorld.fps(ms), ms);
const quality = (q) => page.evaluate((q) => window.__pauWorld.setQuality(q, true), q);
const teleport = (x, z, h) => page.evaluate(([x, z, h]) => window.__pauWorld.teleport(x, z, h), [x, z, h]);
const round = (v) => Math.round(v * 10) / 10;
const measure = async (ms = 4000) => { const f = await fps(ms); return { fps: round(f), frameMs: round(1000 / f), ...(await stats()), props: await page.evaluate(() => window.__pauWorld.props.summary()) }; };
const nearest = (x, z, c) => page.evaluate(([x, z, c]) => window.__pauWorld.props.nearest(x, z, c), [x, z, c]);
const phase = (id) => page.evaluate((id) => window.__pauWorld.props.state(id).phase, id);
const holdUntil = async (key, pred, ms = 15000) => { await page.keyboard.down(key); const s = Date.now(); try { while (Date.now() - s < ms) { if (await pred()) return true; await page.waitForTimeout(100); } return false; } finally { await page.keyboard.up(key); } };
const aim = async (p, from, contact, gap) => { const dx = p.x - from[0], dz = p.z - from[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len; await teleport(p.x - ux * (contact + gap), p.z - uz * (contact + gap), Math.atan2(ux, uz)); await page.waitForTimeout(300); };

out.scenarios.city = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(0, 27, Math.PI);
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  out.scenarios.city[q] = await measure(4000);
  await page.keyboard.up("KeyW");
}
out.scenarios.plaza = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(10, 22, -Math.PI / 4);
  await page.waitForTimeout(800);
  out.scenarios.plaza[q] = await measure(3000);
}
await quality("high");
out.scenarios.knockLoop = { before: await measure(2000), hits: [] };
const targets = [[4.8, 31.5, "lamp"], [-4.8, 31.5, "lamp"], [4.8, 19.5, "lamp"], [-4.8, 19.5, "lamp"], [14.9, 6.2, "planter"], [6.2, 14.9, "bench"], [-6.2, 14.9, "bench"], [-14.9, 6.2, "planter"]];
for (const [x, z, c] of targets) {
  const p = await nearest(x, z, c);
  if (!p) continue;
  const from = c === "lamp" ? [p.x > 0 ? -2 : 2, p.z] : [p.x * 2, p.z * 2];
  await aim(p, from, 1.3 + (c === "lamp" ? 0.24 : c === "planter" ? 0.95 : 0.3), 4.5);
  const t = Date.now();
  const ok = await holdUntil("KeyW", async () => ["falling", "down"].includes(await phase(p.id)), 12000);
  out.scenarios.knockLoop.hits.push({ id: p.id, category: c, knocked: ok, ms: Date.now() - t });
}
out.scenarios.knockLoop.during = await measure(3000);
await page.waitForTimeout(4000);
out.scenarios.knockLoop.afterSettle = await measure(2000);
await teleport(0, 27, Math.PI);
await page.getByTestId("reset-world").click();
await page.waitForTimeout(2500);
out.scenarios.knockLoop.afterReset = await measure(2000);
await page.evaluate(() => window.__pauWorld.debug.colliders(true));
await page.waitForTimeout(800);
out.scenarios.overlayOn = await measure(3000);
await page.evaluate(() => window.__pauWorld.debug.colliders(false));
console.log(JSON.stringify(out, null, 2));
await browser.close();
