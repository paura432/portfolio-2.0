import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:3101";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate(() => window.__pauWorld.setQuality("high", true));
const s = () => page.evaluate(() => { const t = window.__pauWorld.stats(); return `geo=${t.geometries} tex=${t.textures} prog=${t.programs}`; });
console.log("start      ", await s());
await page.waitForTimeout(3000); console.log("idle 3s    ", await s());
await page.waitForTimeout(3000); console.log("idle 6s    ", await s());
for (let i = 0; i < 5; i++) await page.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
await page.waitForTimeout(500); console.log("5 teleports", await s());
for (let i = 0; i < 5; i++) { await page.evaluate((c) => window.__pauWorld.photo(c), { position: [0, 10, 40], target: [0, 0, 0], fov: 50 }); await page.waitForTimeout(100); await page.evaluate(() => window.__pauWorld.photo(null)); }
await page.waitForTimeout(500); console.log("5 photos   ", await s());
for (const q of ["low", "medium", "high", "low", "high"]) { await page.evaluate((q) => window.__pauWorld.setQuality(q, true), q); await page.waitForTimeout(300); }
console.log("5 quality  ", await s());
await page.keyboard.down("KeyW"); await page.waitForTimeout(2000); await page.keyboard.up("KeyW");
console.log("drive 2s   ", await s());
await page.keyboard.press("KeyM"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
await page.keyboard.press("KeyM"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
console.log("2 menus    ", await s());
await page.waitForTimeout(3000); console.log("idle 3s    ", await s());
await browser.close();
