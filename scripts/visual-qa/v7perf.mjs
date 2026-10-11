// Usage: node scripts/visual-qa/v7perf.mjs [base] [--label name]
// V7 performance scenarios (SwiftShader: relative numbers only):
//  1 city driving north from the spawn (3 tiers, same as v4perf/v6perf "city")
//  2 skyport: car parked on the pad looking down the runway (3 tiers)
//  3 flight over the city at 42 u (3 tiers): the far camera sees most of the archipelago
//  4 high flight over the archipelago at 70 u (3 tiers)
//  5 transform → takeoff → land → reconfigure, counters before and after (real E / W / S)
//  6 quality cycles while airborne: counters flat
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const label = opt("--label", "v7");
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
const teleportPlane = (x, y, z, h) => page.evaluate(([x, y, z, h]) => window.__pauWorld.teleportPlane(x, y, z, h, true), [x, y, z, h]);
const round = (v) => Math.round(v * 10) / 10;
const measure = async (ms = 4000) => { const f = await fps(ms); return { fps: round(f), frameMs: round(1000 / f), ...(await stats()) }; };
const waitVehicle = (pred, timeout = 120000) => page.waitForFunction(pred, null, { timeout });

// 1. City driving (same scenario as V4/V5/V6 for comparison).
out.scenarios.city = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(0, 27, Math.PI);
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  out.scenarios.city[q] = await measure(4000);
  await page.keyboard.up("KeyW");
}
// 2. Skyport: car parked on the pad, runway, hangar, tower and sea in frame.
out.scenarios.skyport = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleport(124, -9, Math.PI / 2);
  await page.waitForTimeout(800);
  out.scenarios.skyport[q] = await measure(3000);
}
// 3. Flight over the city (airborne, cruising west).
out.scenarios.flightCity = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleportPlane(60, 42, 30, -Math.PI / 2 - 0.4);
  await page.waitForTimeout(800);
  out.scenarios.flightCity[q] = await measure(4000);
}
// 4. High over the archipelago (the whole world in the frustum).
out.scenarios.flightHigh = {};
for (const q of ["high", "medium", "low"]) {
  await quality(q);
  await teleportPlane(-40, 70, 60, -Math.PI / 2);
  await page.waitForTimeout(800);
  out.scenarios.flightHigh[q] = await measure(4000);
}
await quality("high");
// 5. Real loop with counters: reset to the car on the pad, transform, take off, land (staged approach), stop, reconfigure.
await page.getByTestId("reset-car").click();
await waitVehicle(() => window.__pauWorld.vehicle().carForm === "car");
await teleport(124, -9, Math.PI / 2);
await page.waitForTimeout(800);
const before = await stats();
await page.keyboard.press("KeyE");
await waitVehicle(() => window.__pauWorld.vehicle().flight === "plane-ready");
await page.keyboard.down("KeyW");
await waitVehicle(() => !window.__pauWorld.plane().onGround);
await page.waitForTimeout(2000);
await page.keyboard.up("KeyW");
await teleportPlane(80, 16, -9, Math.PI / 2);
await page.waitForTimeout(500);
await page.keyboard.down("Space");
await page.waitForTimeout(1200);
await page.keyboard.down("KeyS");
await waitVehicle(() => window.__pauWorld.plane().onGround);
await page.keyboard.up("KeyS");
await waitVehicle(() => window.__pauWorld.plane().speed < 0.5);
await page.keyboard.up("Space");
await page.keyboard.press("KeyE");
await waitVehicle(() => window.__pauWorld.vehicle().carForm === "car" && window.__pauWorld.vehicle().flight === "ground");
await page.waitForTimeout(500);
const after = await stats();
out.scenarios.transitions = { before, after, delta: Object.fromEntries(Object.keys(after).map((k) => [k, typeof after[k] === "number" ? after[k] - before[k] : null])) };
// 6. Quality cycles while airborne.
await teleportPlane(60, 42, 30, -Math.PI / 2 - 0.4);
await page.waitForTimeout(500);
const c0 = await stats();
for (let i = 0; i < 3; i++) for (const q of ["medium", "low", "high"]) { await quality(q); await page.waitForTimeout(400); }
const c1 = await stats();
out.scenarios.qualityCycles = { before: c0, after: c1, geometriesDelta: c1.geometries - c0.geometries, texturesDelta: c1.textures - c0.textures, programsDelta: c1.programs - c0.programs, stillFlying: await page.evaluate(() => window.__pauWorld.vehicle().flight === "flying") };
console.log(JSON.stringify(out, null, 2));
await browser.close();
