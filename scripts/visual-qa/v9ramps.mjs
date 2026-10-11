// Usage: node scripts/visual-qa/v9ramps.mjs <outDir> [base]
// V9 iteration 5 evidence: the Campus Ramp after the geometry change (slope 2.5 u south, 14.5 u approach, lining-up
// lead on the campus plaza strip), seen from the plaza side with the AI Workflow lab beside the entry; then a real
// run from the plaza strip: wings deploying on the approach, the lip launch over the east cross road.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? "docs/screenshots/v9";
const base = process.argv.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate(() => window.__pauWorld.setQuality("high", true));
const log = {};
const shot = async (name, ms = 600) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${out}/ramps-${name}.png` }); log[name] = await page.evaluate(() => window.__pauWorld.vehicle()); console.log("shot", name); };
const photo = (position, target, fov = 48) => page.evaluate((c) => window.__pauWorld.photo(c), { position, target, fov });
const follow = () => page.evaluate(() => window.__pauWorld.photo(null));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
try {
  await page.evaluate(() => window.__pauWorld.teleport(50.5, -51, 0));
  await photo([36, 12, -58], [53, 1, -30], 52);
  await shot("01-campus-ramp-from-the-plaza", 900);
  await photo([62, 7, -2], [53, 2, -22], 50);
  await shot("02-campus-ramp-lip-and-cross-road", 700);
  await follow();
  // Real run: W with the helm on the centre line (10 u lookahead), as the E2E does.
  await page.keyboard.down("KeyW");
  let bank = null;
  const t0 = Date.now();
  let deployShot = false;
  while (Date.now() - t0 < 60000) {
    const v = await page.evaluate(() => window.__pauWorld.vehicle());
    if (v.state === "transforming-to-plane" && !deployShot) { await shot("03-campus-wings-deploying-on-the-approach", 0); deployShot = true; }
    if (v.state === "flying") { await shot("04-campus-lip-launch", 0); break; }
    const err = wrap(Math.atan2(53 - v.x, v.z + 10 - v.z) - v.heading);
    const next = Math.abs(err) < 0.08 ? null : err > 0 ? "KeyA" : "KeyD";
    if (next !== bank) { if (bank) await page.keyboard.up(bank); if (next) await page.keyboard.down(next); bank = next; }
    await page.waitForTimeout(120);
  }
  if (bank) await page.keyboard.up(bank);
  await page.waitForTimeout(1500);
  await shot("05-campus-climb-over-the-city", 0);
  await page.keyboard.up("KeyW");
} finally {
  writeFileSync(`${out}/ramps-log.json`, JSON.stringify(log, null, 2));
  await browser.close();
}
