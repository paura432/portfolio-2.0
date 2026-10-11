// Usage: node scripts/visual-qa/v7shots.mjs <outDir> [base] [--quality high|medium|low] [--mobile] [--only name,name]
// V7 Sky Ascent QA: car arriving over the causeway, Skyport aerial, the pad, transformation start / wings
// deploying / plane ready (fixed cameras: rear, side, three-quarter, top), taxi run-up, lift-off, flight over the
// city, archipelago from the air, approach, touchdown, roll-out, reconfiguration. Real E key and real flight.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const out = args[0] ?? "docs/screenshots/v7";
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
page.on("console", (m) => {
  if (m.type() === "error") console.error("console", m.text());
});
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
const plane = () => page.evaluate(() => window.__pauWorld.plane());
const vehicle = () => page.evaluate(() => window.__pauWorld.vehicle());
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
const waitFlight = (f, timeout = 60000) => page.waitForFunction((f) => window.__pauWorld.vehicle().flight === f, f, { timeout });

try {
  // 1. Causeway and Skyport
  await follow();
  await teleport(70, 0, Math.PI / 2);
  await shot("01-causeway-drive", 900);
  await photo([120, 45, 60], [152, 0, -2], 52);
  await shot("02-skyport-aerial", 900);
  await photo([112, 4, 4], [126, 1, -9], 50);
  await shot("03-pad", 800);
  // 2. Car on the pad (parked), transformation
  await follow();
  await teleport(124, -9, Math.PI / 2);
  await page.waitForTimeout(700);
  await page.getByTestId("transform-prompt").waitFor({ timeout: 5000 });
  await shot("04-car-on-pad", 300);
  const tp = (dx, dy, dz, fov = 44) => photo([124 + dx, dy, -9 + dz], [124, 0.9, -9], fov);
  // Rear three-quarter from the left, through the gap between the pad masts (a screenshot takes ≈ 1 s in SwiftShader, so no extra waits).
  await tp(-7.4, 3, 3.2);
  await page.keyboard.press("KeyE");
  // One mid-sequence frame: a SwiftShader screenshot takes ≈ 1 s, so a second one lands after the 2 s sequence has ended
  // (the fold-back is caught mid-way in 20-reconfiguring).
  await shot("05-transform-start", 0);
  await waitFlight("plane-ready", 30000);
  await shot("07-plane-ready-three-quarter", 500);
  await tp(-9, 2.6, 0);
  await shot("08-plane-rear", 500);
  await tp(0, 2.4, 14, 34);
  await shot("09-plane-side", 500);
  await tp(0.01, 12, 0.01, 40);
  await shot("10-plane-top", 500);
  // 3. Takeoff and flight (follow camera)
  await follow();
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__pauWorld.plane().speed > 8, null, { timeout: 30000 });
  await shot("11-taxi-run-up", 50);
  await page.waitForFunction(() => !window.__pauWorld.plane().onGround, null, { timeout: 60000 });
  await shot("12-liftoff", 100);
  await page.waitForTimeout(2500);
  await shot("13-climb", 50);
  await page.keyboard.up("KeyW");
  // Bank left over the sea
  await hold("KeyA", 2200);
  await shot("14-banking", 50);
  // Fly over the city for the aerial
  await page.evaluate(() => window.__pauWorld.teleportPlane(60, 42, 30, -Math.PI / 2 - 0.4, true));
  await page.waitForTimeout(1200);
  await shot("15-flight-over-city", 50);
  // High over the sea south-east of the city, heading north-west: city, Skyport and the Creative Lab island in one frame.
  await page.evaluate(() => window.__pauWorld.teleportPlane(150, 80, 120, Math.atan2(-150, -120), true));
  await page.waitForTimeout(1200);
  await shot("16-archipelago-from-air", 50);
  // 4. Approach and landing on the Skyport runway
  await page.evaluate(() => window.__pauWorld.teleportPlane(88, 14, -9, Math.PI / 2, true));
  await page.waitForTimeout(800);
  await shot("17-approach", 50);
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => window.__pauWorld.plane().onGround, null, { timeout: 60000 });
  await page.keyboard.up("KeyS");
  await shot("18-touchdown", 50);
  await hold("Space", 3000);
  await page.waitForFunction(() => window.__pauWorld.plane().speed < 0.6, null, { timeout: 30000 });
  await shot("19-rollout-stopped", 400);
  await page.getByTestId("transform-prompt").waitFor({ timeout: 5000 });
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(800);
  await shot("20-reconfiguring", 50);
  await page.waitForFunction(() => window.__pauWorld.vehicle().carForm === "car", null, { timeout: 30000 });
  await shot("21-car-again", 600);
} catch (e) {
  await page.screenshot({ path: `${out}/${prefix}-zz-failure.png` });
  console.error("FAILED:", e.message, JSON.stringify(await vehicle()), JSON.stringify(await plane()));
}
writeFileSync(`${out}/${prefix}-stats.json`, JSON.stringify(stats, null, 1));
await browser.close();
