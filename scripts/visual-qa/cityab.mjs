// Usage: node scripts/visual-qa/cityab.mjs <base> [label]
// Same-machine A/B: the "city" scenario (drive north from the spawn, 4 s per tier) against a base URL; prints JSON.
import { chromium } from "@playwright/test";
const base = process.argv[2];
const label = process.argv[3] ?? base;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
const t1 = Date.now();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
const firstFrameMs = Date.now() - t1;
const out = { label, firstFrameMs, city: {} };
const round = (v) => Math.round(v * 10) / 10;
for (const q of ["high", "medium", "low"]) {
  await page.evaluate((q) => window.__pauWorld.setQuality(q, true), q);
  await page.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  const f = await page.evaluate((ms) => window.__pauWorld.fps(ms), 4000);
  await page.keyboard.up("KeyW");
  const s = await page.evaluate(() => window.__pauWorld.stats());
  out.city[q] = { fps: round(f), frameMs: round(1000 / f), calls: s.calls, triangles: s.triangles, geometries: s.geometries, programs: s.programs };
}
console.log(JSON.stringify(out));
await browser.close();
