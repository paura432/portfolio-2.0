// Usage: node scripts/visual-qa/v6shots.mjs <outDir> [base] [--quality high|medium|low] [--mobile] [--only name,name]
// V6 ocean QA: island aerial surrounded by water, coast, harbor, parked car, moored boat, boarding prompt,
// boat turnaround (rear/side/three-quarter/top), sailing with wake, turn, second island, pier approach,
// docking prompt, moored + POI panel, boat-mode minimap. Real transitions through the E key.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const args = process.argv.slice(2);
const out = args[0] ?? "docs/screenshots/v6";
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
const boat = () => page.evaluate(() => window.__pauWorld.boat());
const vehicle = () => page.evaluate(() => window.__pauWorld.vehicle());
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};

// 1. Island in the sea
await photo([-10, 120, 125], [-25, 0, -5], 56);
await shot("01-aerial-island", 1000);
await photo([-120, 60, 90], [-40, 0, 0], 50);
await shot("02-aerial-west-coast", 900);
// 2. Harbor from the road, car arriving
await follow();
await teleport(-52, 0, -Math.PI / 2);
await shot("03-harbor-approach", 900);
await photo([-58, 6, -14], [-76, 0.5, 2], 50);
await shot("04-harbor-quay", 800);
await photo([-90, 5, 12], [-78, 0.5, 2], 50);
await shot("05-pier-from-sea", 800);
// 3. Park and board
await follow();
await teleport(-70.5, 0, -Math.PI / 2);
await page.waitForTimeout(700);
await page.getByTestId("vehicle-prompt").waitFor({ timeout: 5000 });
await shot("06-boarding-prompt", 300);
await photo([-80, 3.2, 12], [-84, 0.2, 5.6], 46);
await shot("07-boat-moored", 700);
await follow();
await page.keyboard.press("KeyE");
await page.waitForTimeout(700);
await shot("08-boarding-transition", 100);
await page.waitForFunction(() => window.__pauWorld.vehicle().active === "boat" && !window.__pauWorld.vehicle().transition, null, { timeout: 8000 });
await shot("09-boat-active", 600);
// 4. Boat turnaround from fixed cameras (hull at the mooring)
const b0 = await boat();
const tp = (dx, dy, dz, fov = 42) => photo([b0.x + dx, b0.y - 1.1 + dy + 1.4, b0.z + dz], [b0.x, b0.y - 1.1 + 0.9, b0.z], fov);
await tp(7.5, 1.6, 0); // boat heads west (-X): behind is +X
await shot("10-boat-rear", 700);
await tp(0, 1.4, 8);
await shot("11-boat-side", 700);
await tp(5.5, 2.4, 5.5);
await shot("12-boat-three-quarter", 700);
await tp(0.01, 11, 0.01, 40);
await shot("13-boat-top", 700);
// 5. Sail: accelerate west, wake, turn
await follow();
await hold("KeyW", 3500);
await shot("14-sailing", 100);
await page.keyboard.down("KeyW");
await page.keyboard.down("KeyA");
await page.waitForTimeout(1800);
await shot("15-turning", 50);
await page.keyboard.up("KeyA");
await page.keyboard.up("KeyW");
const b1 = await boat();
await photo([b1.x + 14, b1.y + 6, b1.z + 10], [b1.x, b1.y, b1.z - 4], 50);
await shot("16-wake", 500);
// 6. Second island: approach the pier by sailing (teleport near, then real approach)
await follow();
await page.evaluate(() => window.__pauWorld.teleportBoat(-125, 36, -Math.PI / 2));
await page.waitForTimeout(500);
await shot("17-island-ahead", 600);
await hold("KeyW", 2200);
await page.waitForTimeout(2500);
let v = await vehicle();
for (let i = 0; i < 30 && !v.nearbyDock; i++) {
  await hold("KeyW", 300);
  v = await vehicle();
}
// Brake to a stop inside the zone, then dock for real with E.
await hold("Space", 2500);
await page.waitForFunction(() => window.__pauWorld.boat().speed < 1, null, { timeout: 15000 });
await page.getByTestId("vehicle-prompt").waitFor({ timeout: 8000 });
await shot("18-docking-prompt", 300);
await page.keyboard.press("KeyE");
await page.waitForFunction(() => window.__pauWorld.vehicle().mooredAt === "creative-lab-pier", null, { timeout: 8000 });
await shot("19-moored", 800);
await page.getByTestId("interact-prompt").waitFor({ timeout: 5000 });
await page.keyboard.press("KeyE");
await page.getByTestId("poi-panel").waitFor();
await shot("20-poi-panel", 500);
await page.keyboard.press("Escape");
await photo([-135, 30, 80], [-178, 0, 30], 50);
await shot("21-island-aerial", 900);
await follow();
writeFileSync(`${out}/${prefix}-stats.json`, JSON.stringify(stats, null, 1));
await browser.close();
