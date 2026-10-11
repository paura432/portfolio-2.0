// Usage: node scripts/visual-qa/v8probe.mjs <outDir> [base]
// V8 mechanics probe: drives the west ramp (takeoff, flight, landing) and the south beach (car → boat → car) for real and logs the state machine.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? "/tmp/v8probe";
const base = process.argv[3] ?? "http://127.0.0.1:3101";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.error("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("console", m.text()); });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate(() => window.__pauWorld.setQuality("low", true));
const v = () => page.evaluate(() => window.__pauWorld.vehicle());
const fmt = (s) => `${s.state}/${s.authority} x=${s.x.toFixed(1)} y=${s.y.toFixed(2)} z=${s.z.toFixed(1)} v=${s.speed.toFixed(1)} h=${s.heading.toFixed(2)} ramp=${s.nearbyRamp} beach=${s.nearbyBeach} lz=${s.landingZone} p=${s.progress.toFixed(2)}`;
async function holdLog(key, ms, label, stopWhen) {
  await page.keyboard.down(key);
  const t0 = Date.now();
  let last = "";
  try {
    while (Date.now() - t0 < ms) {
      const s = await v();
      const line = fmt(s);
      if (line.split(" ")[0] !== last.split(" ")[0] || Date.now() - t0 > ms - 200) console.log(label, ((Date.now() - t0) / 1000).toFixed(1) + "s", line);
      last = line;
      if (stopWhen && stopWhen(s)) return s;
      await page.waitForTimeout(150);
    }
    return await v();
  } finally { await page.keyboard.up(key); }
}
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}.png` }); console.log("shot", name); };

// ---- Ramp: approach from 8 u before the corridor, heading +Z (south).
console.log("== RAMP");
await page.evaluate(() => window.__pauWorld.teleport(-53, 2, 0));
await page.waitForTimeout(500);
await page.evaluate(() => window.__pauWorld.photo({ position: [-68, 9, 26], target: [-53, 2, 44], fov: 50 }));
await shot("ramp-structure");
await page.evaluate(() => window.__pauWorld.photo(null));
let s = await holdLog("KeyW", 14000, "ramp", (s) => s.state === "flying");
await shot("ramp-liftoff");
console.log("after ramp:", fmt(s));
if (s.state === "flying") {
  s = await holdLog("KeyW", 2500, "climb");
  await shot("flight");
  // Level, then descend toward the city turf and land.
  s = await holdLog("KeyS", 20000, "descend", (s) => s.authority === "car" || s.authority === "boat");
  console.log("after descent:", fmt(s));
  await shot("after-landing");
  s = await holdLog("Space", 4000, "brake", (s) => s.speed < 0.5);
  console.log("stopped:", fmt(s));
}

// ---- Beach: from the south ring road toward the south beach, heading +Z.
console.log("== BEACH");
await page.evaluate(() => window.__pauWorld.teleport(26, 46, 0));
await page.waitForTimeout(500);
await page.evaluate(() => window.__pauWorld.photo({ position: [8, 8, 60], target: [26, -1, 76], fov: 55 }));
await shot("beach-structure");
await page.evaluate(() => window.__pauWorld.photo(null));
s = await holdLog("KeyW", 15000, "beach", (s) => s.state === "floating");
await shot("floating");
console.log("after beach:", fmt(s));
if (s.state === "floating") {
  s = await holdLog("KeyW", 2500, "sail");
  // Turn around (A) until heading ≈ π then sail back to the sand.
  s = await holdLog("KeyA", 12000, "turn", (s) => Math.abs(Math.atan2(Math.sin(s.heading - Math.PI), Math.cos(s.heading - Math.PI))) < 0.25);
  s = await holdLog("KeyW", 15000, "return", (s) => s.state === "car");
  console.log("after return:", fmt(s));
  await shot("back-on-land");
}
await browser.close();
