// Usage: node scripts/visual-qa/v9shots.mjs <outDir> [base] [--quality high|medium|low] [--only name,name]
// V9 world QA: destructible street furniture before / after real impacts (lamp rattled and knocked over, planter shoved and
// tipped, bench flipped), the reset, and the collider debug overlay (static colliders, drive areas, ramps, beaches, live
// prop colliders, the car's circle and the contact points) over the plaza and the open-front hangar. Real keys; teleports only stage.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const out = args[0] ?? "docs/screenshots/v9";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const quality = opt("--quality", "high");
const only = opt("--only", "").split(",").filter(Boolean);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.error("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("console", m.text()); });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate((q) => window.__pauWorld.setQuality(q, true), quality);
const prefix = quality;
const stats = {};
const shot = async (name, ms = 600) => {
  if (only.length && !only.includes(name)) return;
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
  stats[name] = { ...(await page.evaluate(() => window.__pauWorld.stats())), props: await page.evaluate(() => window.__pauWorld.props.summary()) };
  console.log("shot", name);
};
const photo = (position, target, fov = 46) => page.evaluate((c) => window.__pauWorld.photo(c), { position, target, fov });
const follow = () => page.evaluate(() => window.__pauWorld.photo(null));
const teleport = (x, z, h) => page.evaluate(([x, z, h]) => window.__pauWorld.teleport(x, z, h), [x, z, h]);
const nearest = (x, z, c) => page.evaluate(([x, z, c]) => window.__pauWorld.props.nearest(x, z, c), [x, z, c]);
const phase = (id) => page.evaluate((id) => window.__pauWorld.props.state(id).phase, id);
const position = (id) => page.evaluate((id) => window.__pauWorld.props.position(id), id);
const holdUntil = async (key, pred, ms = 15000) => {
  await page.keyboard.down(key);
  const t0 = Date.now();
  try { while (Date.now() - t0 < ms) { if (await pred()) return true; await page.waitForTimeout(100); } return false; } finally { await page.keyboard.up(key); }
};
const aim = async (p, from, contact, gap) => {
  const dx = p.x - from[0], dz = p.z - from[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
  await teleport(p.x - ux * (contact + gap), p.z - uz * (contact + gap), Math.atan2(ux, uz));
  await page.waitForTimeout(300);
  return [ux, uz];
};
const propCam = (p, h = 2.6) => photo([p.x + 6, h + 1.5, p.z + 4.5], [p.x, h * 0.5, p.z], 44);

try {
  // ---- Street lamp (east sidewalk of the south road)
  const lamp = await nearest(4.8, 31.5, "lamp");
  await teleport(0, 27, Math.PI);
  await propCam(lamp);
  await shot("01-lamp-intact", 800);
  await follow();
  await aim(lamp, [-2, lamp.z], 1.54, 0.3);
  await holdUntil("KeyW", async () => (await phase(lamp.id)) !== "standing", 8000);
  await shot("02-lamp-rattled", 0);
  await page.waitForTimeout(1500);
  await aim(lamp, [-2, lamp.z], 1.54, 4);
  await holdUntil("KeyW", async () => ["falling", "down"].includes(await phase(lamp.id)));
  await shot("03-lamp-knocked-follow", 0);
  await teleport(0, 27, Math.PI);
  await propCam(lamp);
  await page.waitForFunction((id) => window.__pauWorld.props.state(id).phase === "down", lamp.id, { timeout: 15000 });
  await shot("04-lamp-down", 600);
  await follow();
  await page.getByTestId("reset-world").click();
  await page.waitForFunction((id) => window.__pauWorld.props.state(id).phase === "standing", lamp.id, { timeout: 10000 });
  await propCam(lamp);
  await shot("05-lamp-restored", 600);
  await follow();

  // ---- Planter (plaza ring, 22.5°)
  const planter = await nearest(14.9, 6.2, "planter");
  await teleport(0, 27, Math.PI);
  await propCam(planter, 1.6);
  await shot("06-planter-intact", 800);
  await follow();
  await aim(planter, [planter.x * 2, planter.z * 2], 2.25, 1.0);
  await holdUntil("KeyW", async () => (await phase(planter.id)) !== "standing", 8000);
  await page.waitForFunction((id) => window.__pauWorld.props.state(id).phase === "standing", planter.id, { timeout: 10000 });
  const p1 = await position(planter.id);
  await teleport(0, 27, Math.PI);
  await propCam(planter, 1.6);
  await shot("07-planter-shoved", 600);
  await follow();
  await aim(p1, [planter.x * 2, planter.z * 2], 2.25, 4);
  await holdUntil("KeyW", async () => ["falling", "down"].includes(await phase(planter.id)));
  await shot("08-planter-tipping-follow", 0);
  await teleport(0, 27, Math.PI);
  await propCam(planter, 1.6);
  await page.waitForFunction((id) => window.__pauWorld.props.state(id).phase === "down", planter.id, { timeout: 15000 });
  await shot("09-planter-down", 600);
  await follow();

  // ---- Bench (plaza ring, 67.5°)
  const bench = await nearest(6.2, 14.9, "bench");
  await teleport(0, 27, Math.PI);
  await propCam(bench, 1.2);
  await shot("10-bench-intact", 800);
  await follow();
  await aim(bench, [bench.x * 2, bench.z * 2], 1.6, 2.6);
  await holdUntil("KeyW", async () => ["falling", "down"].includes(await phase(bench.id)));
  await shot("11-bench-flipped-follow", 0);
  await teleport(0, 27, Math.PI);
  await propCam(bench, 1.2);
  await page.waitForFunction((id) => window.__pauWorld.props.state(id).phase === "down", bench.id, { timeout: 15000 });
  await shot("12-bench-down", 600);
  await follow();

  // ---- Collider overlay (debug tooling): plaza with the down props, then the open-front hangar.
  await page.evaluate(() => window.__pauWorld.debug.colliders(true));
  await photo([30, 34, 44], [4, 0, 8], 50);
  await shot("13-colliders-plaza", 900);
  await photo([150, 16, -4], [142, 2, 16], 50);
  await shot("14-colliders-hangar-open-front", 900);
  await follow();
  // Drive at the hangar's open front for real: the car enters it.
  await teleport(142, 2, 0);
  await holdUntil("KeyW", async () => (await page.evaluate(() => window.__pauWorld.car())).z > 14, 12000);
  await photo([150, 10, 2], [142, 2, 16], 50);
  await shot("15-car-inside-hangar", 600);
  await page.evaluate(() => window.__pauWorld.debug.colliders(false));
  await follow();
  await page.getByTestId("reset-world").click();
} finally {
  writeFileSync(`${out}/${prefix}-stats.json`, JSON.stringify(stats, null, 2));
  await browser.close();
}
