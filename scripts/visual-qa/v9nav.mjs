// Usage: node scripts/visual-qa/v9nav.mjs <outDir> [base]
// V9 navigation evidence: the Duplex forecourt corner (the former wedge pose) with the collider overlay and the
// contact normals while the car reverses into the facade padding and then drives out along the sidewalk; the follow
// camera's own view of the same pose (CAM-01 evidence); the plaza south exit pocket. Real keys; teleports only stage.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const out = args[0] ?? "docs/screenshots/v9";
const base = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3101";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.error("pageerror", e.message));
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate(() => window.__pauWorld.setQuality("high", true));
const log = {};
const shot = async (name, ms = 600) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${out}/nav-${name}.png` }); log[name] = { car: await page.evaluate(() => window.__pauWorld.car()), contacts: await page.evaluate(() => window.__pauWorld.debug.contactLog(10)) }; console.log("shot", name); };
const photo = (position, target, fov = 46) => page.evaluate((c) => window.__pauWorld.photo(c), { position, target, fov });
const follow = () => page.evaluate(() => window.__pauWorld.photo(null));
const teleport = (x, z, h) => page.evaluate(([x, z, h]) => window.__pauWorld.teleport(x, z, h), [x, z, h]);
const hold = async (keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); };
try {
  await page.evaluate(() => { window.__pauWorld.debug.colliders(true); window.__pauWorld.debug.telemetry(true); });
  // Duplex forecourt corner: the former wedge pose, seen from above the sidewalk with the overlay.
  await teleport(-18.5, -17, Math.PI / 2);
  await photo([-10, 9, -9], [-18.5, 0.5, -17], 50);
  await shot("01-duplex-corner-overlay", 900);
  // Reverse into the facade padding: contact dots and normals appear.
  await hold(["KeyS"], 1500);
  await shot("02-duplex-corner-contact-normals", 300);
  // Pivot and drive out along the sidewalk corridor.
  await hold(["KeyW", "KeyA"], 4000);
  await shot("03-duplex-corner-pivot-out", 300);
  await hold(["KeyW"], 4000);
  await shot("04-duplex-sidewalk-corridor", 300);
  // The follow camera's own framing of the pose (CAM-01).
  await page.evaluate(() => window.__pauWorld.debug.colliders(false));
  await follow();
  await teleport(-18.5, -17, Math.PI / 2);
  await shot("05-duplex-corner-follow-camera", 1200);
  // Plaza south exit pocket with the overlay, then the car drives out.
  await page.evaluate(() => window.__pauWorld.debug.colliders(true));
  await teleport(-6.5, 17.5, Math.PI / 4);
  await photo([4, 10, 26], [-6.5, 0.5, 17.5], 50);
  await shot("06-plaza-exit-pocket-overlay", 900);
  await hold(["KeyS", "KeyA"], 4000);
  await shot("07-plaza-exit-pocket-out", 300);
} finally {
  writeFileSync(`${out}/nav-log.json`, JSON.stringify(log, null, 2));
  await page.evaluate(() => { window.__pauWorld.debug.colliders(false); window.__pauWorld.debug.telemetry(false); }).catch(() => {});
  await browser.close();
}
