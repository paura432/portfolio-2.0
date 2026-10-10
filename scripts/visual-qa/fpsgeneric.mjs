// Usage: node .probe/fpsgeneric.mjs <baseURL> — build-agnostic FPS while driving (rAF counting), high quality forced via the HUD if possible.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:3101";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
const t1 = Date.now();
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
const firstFrameMs = Date.now() - t1;
await page.waitForTimeout(800);
// Old builds: make sure "High" is active (the monitor may have declined to Reduced).
await page.evaluate(() => { const b = document.querySelector("button[aria-pressed='true']"); if (b) b.click(); });
await page.waitForTimeout(300);
await page.keyboard.down("KeyW");
const fps = await page.evaluate(() => new Promise((resolve) => { let n = 0; const s = performance.now(); const tick = () => { n++; if (performance.now() - s < 4000) requestAnimationFrame(tick); else resolve((n * 1000) / (performance.now() - s)); }; requestAnimationFrame(tick); }));
await page.keyboard.up("KeyW");
console.log(JSON.stringify({ base, firstFrameMs, fps: Math.round(fps * 10) / 10 }));
await browser.close();
