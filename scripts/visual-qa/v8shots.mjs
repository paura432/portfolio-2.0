// Usage: node scripts/visual-qa/v8shots.mjs <outDir> [base] [--quality high|medium|low] [--mobile] [--only name,name]
// V8 Transformer-X QA: the West City Ramp (structure, approach, wings deploying on the slope, lip launch, flight,
// city from the air), South Beach (structure, car on the sand, hull deploying at the waterline, sailing, wake),
// East Beach exit (wheels down, back on the road), HUD modes. Real keys and real transformations; teleports only stage.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const out = args[0] ?? "docs/screenshots/v8";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const quality = opt("--quality", "high");
const only = opt("--only", "").split(",").filter(Boolean);
const mobile = args.includes("--mobile");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext(mobile ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("console", m.text()); });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate((q) => window.__pauWorld.setQuality(q, true), quality);
const prefix = `${mobile ? "mobile-" : ""}${quality}`;
const stats = {};
const shot = async (name, ms = 600) => {
  if (only.length && !only.includes(name)) return;
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
  stats[name] = { ...(await page.evaluate(() => window.__pauWorld.stats())), vehicle: await page.evaluate(() => window.__pauWorld.vehicle()) };
  console.log("shot", name);
};
const photo = (position, target, fov = 48) => page.evaluate((c) => window.__pauWorld.photo(c), { position, target, fov });
const follow = () => page.evaluate(() => window.__pauWorld.photo(null));
const teleport = (x, z, h) => page.evaluate(([x, z, h]) => window.__pauWorld.teleport(x, z, h), [x, z, h]);
const vehicle = () => page.evaluate(() => window.__pauWorld.vehicle());
const waitState = (pred, timeout = 40000) => page.waitForFunction((src) => new Function("v", `return (${src})(v)`)(window.__pauWorld.vehicle()), pred.toString(), { timeout });
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

try {
  // ---- West City Ramp
  await follow();
  await teleport(-53, 2, 0);
  await photo([-70, 9, 24], [-53, 2, 44], 50);
  await shot("01-ramp-structure", 900);
  await photo([-53, 6, 12], [-53, 2, 40], 46);
  await shot("02-ramp-approach", 500);
  await follow();
  await shot("03-car-at-ramp", 500);
  await page.keyboard.down("KeyW");
  await waitState((v) => v.state === "transforming-to-plane");
  await shot("04-wings-deploying", 0);
  await waitState((v) => v.state === "flying", 30000);
  await shot("05-lip-launch", 0);
  await page.waitForTimeout(2000);
  await shot("06-climb", 0);
  await page.keyboard.up("KeyW");
  await hold("KeyA", 3000);
  await shot("07-banking", 0);
  // Over the city for the aerial
  await page.evaluate(() => window.__pauWorld.teleportPlane(60, 42, 30, -Math.PI / 2 - 0.4));
  await page.waitForTimeout(1200);
  await shot("08-flight-over-city", 0);
  // Approach and land on the south turf: west along z = 50, already over the island's east edge.
  await page.evaluate(() => window.__pauWorld.teleportPlane(56, 14, 50, -Math.PI / 2));
  await page.waitForTimeout(800);
  await shot("09-approach", 0);
  await page.keyboard.down("KeyS");
  await waitState((v) => v.authority === "car", 60000);
  await page.keyboard.up("KeyS");
  await shot("10-touchdown", 0);
  await hold("Space", 3500);
  await waitState((v) => v.state === "car", 30000);
  await shot("11-rolled-out-car", 500);

  // ---- South Beach
  await teleport(26, 46, 0);
  await page.waitForTimeout(500);
  await photo([4, 7, 58], [26, -1, 78], 55);
  await shot("12-beach-structure", 900);
  await follow();
  await teleport(26, 58, 0);
  await page.waitForTimeout(600);
  await shot("13-car-on-sand", 500);
  await page.keyboard.down("KeyW");
  await waitState((v) => v.state === "transforming-to-boat");
  await shot("14-hull-deploying", 0);
  await waitState((v) => v.state === "floating");
  await shot("15-afloat", 0);
  await page.waitForTimeout(2500);
  await shot("16-sailing-wake", 0);
  await page.keyboard.up("KeyW");
  await photo([34, 2.4, 110], [26, -0.5, 100], 44);
  await shot("17-hull-side", 600);
  await photo([26, 1.8, 92], [26, -0.4, 100], 44);
  await shot("18-hull-rear", 600);
  await follow();

  // ---- East Beach exit: staged afloat off the sand, heading west up the beach.
  await page.evaluate(() => window.__pauWorld.teleportBoat(98, 28, -Math.PI / 2));
  await page.waitForTimeout(600);
  await page.keyboard.down("KeyW");
  await waitState((v) => v.state === "exiting-water", 40000);
  await shot("19-wheels-down", 0);
  await waitState((v) => v.state === "car", 30000);
  await page.keyboard.up("KeyW");
  await shot("20-back-on-land", 600);
  await photo([66, 20, 70], [76, 0, 30], 52);
  await shot("21-east-beach-aerial", 900);
  await follow();
} catch (e) {
  await page.screenshot({ path: `${out}/${prefix}-zz-failure.png` });
  console.error("FAILED:", e.message, JSON.stringify(await vehicle()));
}
writeFileSync(`${out}/${prefix}-stats.json`, JSON.stringify(stats, null, 1));
await browser.close();
