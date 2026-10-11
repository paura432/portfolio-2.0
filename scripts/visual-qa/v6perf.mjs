// Usage: node scripts/visual-qa/v6perf.mjs [base] [--label name]
// V6 performance scenarios (SwiftShader: relative numbers only):
//  1 city driving north from the spawn (3 tiers, same as v4perf "world")
//  2 harbor: car parked on the quay, sea + pier + boat in frame (3 tiers)
//  3 open sea: sailing west at full throttle with the wake (3 tiers)
//  4 transitions and counters: board / sail / dock / cast off / sail back / disembark, counters before and after
//  5 quality cycles while sailing: counters flat (ocean geometry rebuilt and disposed)
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const label = opt("--label", "v6");
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
const teleportBoat = (x, z, h) => page.evaluate(([x, z, h]) => window.__pauWorld.teleportBoat(x, z, h), [x, z, h]);
const round = (v) => Math.round(v * 10) / 10;
const measure = async (ms = 4000) => { const f = await fps(ms); return { fps: round(f), frameMs: round(1000 / f), ...(await stats()) }; };
const waitVehicle = (pred, timeout = 20000) => page.waitForFunction(pred, null, { timeout });

// 1. City driving (same scenario as V4/V5 for comparison).
out.scenarios.city = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(0, 27, Math.PI);
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  out.scenarios.city[q] = await measure(4000);
  await page.keyboard.up("KeyW");
}
// 2. Harbor view: car parked on the quay looking at the pier, the boat and the sea.
out.scenarios.harbor = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(-70.5, 0, -Math.PI / 2);
  await page.waitForTimeout(800);
  out.scenarios.harbor[q] = await measure(3000);
}
// Board for real.
await quality("high");
await page.keyboard.press("KeyE");
await waitVehicle(() => window.__pauWorld.vehicle().active === "boat" && !window.__pauWorld.vehicle().transition);
// 3. Open sea sailing per tier.
out.scenarios.sea = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleportBoat(-110, 20, -Math.PI / 2);
  await page.waitForTimeout(600);
  await page.keyboard.down("KeyW");
  out.scenarios.sea[q] = await measure(4000);
  await page.keyboard.up("KeyW");
}
await quality("high");
// 4. Transitions round trip with counters.
const before = await stats();
await teleportBoat(-144, 36, Math.PI);
await page.waitForTimeout(600);
await page.keyboard.press("KeyE");
await waitVehicle(() => window.__pauWorld.vehicle().mooredAt === "creative-lab-pier");
await page.keyboard.press("KeyE");
await page.getByTestId("poi-panel").waitFor();
await page.keyboard.press("Escape");
await page.keyboard.down("KeyW");
await waitVehicle(() => window.__pauWorld.vehicle().mooredAt === null);
await page.waitForTimeout(800);
await page.keyboard.up("KeyW");
await teleportBoat(-90, 8, Math.PI / 2);
await page.waitForTimeout(600);
await page.keyboard.press("KeyE");
await waitVehicle(() => window.__pauWorld.vehicle().active === "car" && !window.__pauWorld.vehicle().transition);
const after = await stats();
out.scenarios.transitions = { before, after, delta: Object.fromEntries(Object.keys(after).map((k) => [k, typeof after[k] === "number" ? after[k] - before[k] : null])) };
// 5. Quality cycles while sailing: geometry counters must come back.
await page.keyboard.press("KeyE");
await waitVehicle(() => window.__pauWorld.vehicle().active === "boat" && !window.__pauWorld.vehicle().transition);
await teleportBoat(-110, 20, -Math.PI / 2);
const c0 = await stats();
for (let i = 0; i < 3; i++) for (const q of ["medium", "low", "high"]) { await quality(q); await page.waitForTimeout(400); }
const c1 = await stats();
out.scenarios.qualityCycles = { before: c0, after: c1, geometriesDelta: c1.geometries - c0.geometries, texturesDelta: c1.textures - c0.textures, programsDelta: c1.programs - c0.programs };
console.log(JSON.stringify(out, null, 2));
await browser.close();
