// Usage: node scripts/visual-qa/v4perf.mjs [base] [--label name] [--base-only]
// V4 performance scenarios (SwiftShader: relative numbers only):
//  1 world without impacts (driving loop, 3 tiers)   2 one tree falling   3 several trees falling
//  4 prolonged driving (counters start vs end)       5 repeated restorations (counters flat, pools empty)
// --base-only runs 1 and 4 (for a build without destructible trees).
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const label = opt("--label", "v4");
const baseOnly = args.includes("--base-only");
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
const measure = async (ms = 4000) => { const f = await fps(ms); return { fps: round(f), frameMs: round(1000 / f), ...(await stats()) }; };

// 1. World without impacts: driving north from the spawn, per tier.
out.scenarios.world = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(0, 27, Math.PI);
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  out.scenarios.world[q] = await measure(4000);
  await page.keyboard.up("KeyW");
}
await quality("high");

const trees = baseOnly ? null : await page.evaluate(() => {
  // Boulevard trees along the south road (west side) and the east side: real, open approaches.
  const pick = (x, z) => window.__pauWorld.trees.nearest(x, z);
  return [pick(-7.3, 29), pick(-7.3, 20), pick(7.3, 29), pick(7.3, 20), pick(-7.3, 38)];
});
const knock = async (t) => {
  // Approach from the road side at ≈ 20 u/s: start 12 units away on the asphalt side.
  const sx = t.x > 0 ? t.x - 12 : t.x + 12;
  await teleport(sx, t.z, t.x > 0 ? Math.PI / 2 : -Math.PI / 2);
  await page.waitForTimeout(150);
  await page.keyboard.down("KeyW");
  const start = Date.now();
  while (Date.now() - start < 6000) {
    const p = await page.evaluate((id) => window.__pauWorld.trees.state(id).phase, t.id);
    if (p !== "standing") break;
    await page.waitForTimeout(80);
  }
  await page.keyboard.up("KeyW");
};

if (!baseOnly) {
  // 2. One tree falling: measure during the fall.
  await knock(trees[0]);
  out.scenarios.oneTree = await measure(2500);
  await page.evaluate(() => window.__pauWorld.trees.reset());
  await page.waitForTimeout(1500);

  // 3. Several trees falling (as many as the approach manages inside ~15 s).
  await page.evaluate(() => window.__pauWorld.trees.timeScale(0.25));
  for (const t of trees) await knock(t);
  out.scenarios.severalTrees = { ...(await measure(2500)), summary: await page.evaluate(() => window.__pauWorld.trees.summary()) };
  await page.evaluate(() => window.__pauWorld.trees.timeScale(1));
  await page.evaluate(() => window.__pauWorld.trees.reset());
  await page.waitForTimeout(1500);
}

// 4. Prolonged driving: a lap of the ring road with turns, counters at start and end.
await teleport(-40, 30, 0);
const startStats = await stats();
await page.keyboard.down("KeyW");
const lapStart = Date.now();
let turn = 0;
while (Date.now() - lapStart < 30000) {
  await page.waitForTimeout(2500);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(700);
  await page.keyboard.up("KeyD");
  turn++;
}
const endDrive = await measure(4000);
await page.keyboard.up("KeyW");
out.scenarios.prolonged = { seconds: 34, turns: turn, start: startStats, end: endDrive, geometryGrowth: endDrive.geometries - startStats.geometries, textureGrowth: endDrive.textures - startStats.textures, programGrowth: endDrive.programs - startStats.programs };

if (!baseOnly) {
  // 5. Repeated restorations: knock + reset ×6, counters must stay flat and pools must drain.
  const before = await stats();
  for (let i = 0; i < 6; i++) {
    await knock(trees[i % trees.length]);
    await page.waitForTimeout(1200);
    await teleport(0, 27, Math.PI);
    await page.evaluate(() => window.__pauWorld.trees.reset());
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(2500);
  const after = await stats();
  out.scenarios.restorations = { cycles: 6, before, after, geometryGrowth: after.geometries - before.geometries, textureGrowth: after.textures - before.textures, programGrowth: after.programs - before.programs, summary: await page.evaluate(() => window.__pauWorld.trees.summary()) };
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
