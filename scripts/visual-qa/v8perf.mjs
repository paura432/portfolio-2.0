// Usage: node scripts/visual-qa/v8perf.mjs [base] [--label name]
// V8 performance scenarios (SwiftShader: relative numbers only):
//  1 city driving north from the spawn (3 tiers, same as v4/v6/v7perf "city")
//  2 ramp: car at the West City Ramp entry, structure and sea in frame (3 tiers)
//  3 beach: hull afloat off South Beach, sand, foam and city edge in frame (3 tiers)
//  4 flight over the city at 42 u (3 tiers)
//  5 ramp → flight → splashdown → beach exit loop, counters before and after (real keys)
//  6 quality cycles while afloat: counters flat
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const label = opt("--label", "v8");
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
const teleportPlane = (x, y, z, h) => page.evaluate(([x, y, z, h]) => window.__pauWorld.teleportPlane(x, y, z, h), [x, y, z, h]);
const round = (v) => Math.round(v * 10) / 10;
const measure = async (ms = 4000) => { const f = await fps(ms); return { fps: round(f), frameMs: round(1000 / f), ...(await stats()) }; };
const waitState = (pred, timeout = 150000) => page.waitForFunction((src) => new Function("v", `return (${src})(v)`)(window.__pauWorld.vehicle()), pred.toString(), { timeout });

out.scenarios.city = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(0, 27, Math.PI);
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  out.scenarios.city[q] = await measure(4000);
  await page.keyboard.up("KeyW");
}
out.scenarios.ramp = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(-53, 4, 0);
  await page.waitForTimeout(800);
  out.scenarios.ramp[q] = await measure(3000);
}
out.scenarios.beach = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleportBoat(26, 90, Math.PI);
  await page.waitForTimeout(800);
  out.scenarios.beach[q] = await measure(3000);
}
out.scenarios.flightCity = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleportPlane(60, 42, 30, -Math.PI / 2 - 0.4);
  await page.waitForTimeout(800);
  out.scenarios.flightCity[q] = await measure(4000);
}
await quality("high");
// Real loop with counters: ramp takeoff, flight, splashdown south of the island, sail back to the beach, wheels down.
await teleport(-53, 2, 0);
await page.waitForTimeout(800);
const before = await stats();
await page.keyboard.down("KeyW");
await waitState((v) => v.state === "flying");
await page.waitForTimeout(2000);
await page.keyboard.up("KeyW");
await page.keyboard.down("KeyS");
await waitState((v) => v.authority === "boat");
await page.keyboard.up("KeyS");
await waitState((v) => v.state === "floating");
await teleportBoat(26, 96, Math.PI);
await page.keyboard.down("KeyW");
await waitState((v) => v.state === "car");
await page.keyboard.up("KeyW");
await page.waitForTimeout(500);
const after = await stats();
out.scenarios.transitions = { before, after, delta: Object.fromEntries(Object.keys(after).map((k) => [k, typeof after[k] === "number" ? after[k] - before[k] : null])) };
await teleportBoat(-120, 60, 0);
await page.waitForTimeout(500);
const c0 = await stats();
for (let i = 0; i < 3; i++) for (const q of ["medium", "low", "high"]) { await quality(q); await page.waitForTimeout(400); }
const c1 = await stats();
out.scenarios.qualityCycles = { before: c0, after: c1, geometriesDelta: c1.geometries - c0.geometries, texturesDelta: c1.textures - c0.textures, programsDelta: c1.programs - c0.programs, stillAfloat: await page.evaluate(() => window.__pauWorld.vehicle().state === "floating") };
console.log(JSON.stringify(out, null, 2));
await browser.close();
