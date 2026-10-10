// Usage: node .probe/fps.mjs [baseURL] [--no-gpu-flags]
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:3101";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const t0 = Date.now();
await page.goto(base + "/");
const tIntro = Date.now() - t0;
await page.getByRole("button", { name: /explore/i }).click();
const t1 = Date.now();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
const tReady = Date.now() - t1;
const ua = await page.evaluate(() => navigator.userAgent);
const gpu = await page.evaluate(() => { const c = document.createElement("canvas"); const gl = c.getContext("webgl2") || c.getContext("webgl"); const d = gl.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "unknown"; });
const out = { ua, gpu, introMs: tIntro, firstFrameMs: tReady, tiers: {} };
for (const q of ["high", "medium", "low"]) {
  await page.evaluate((q) => window.__pauWorld.setQuality(q, true), q);
  await page.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
  await page.waitForTimeout(800);
  await page.keyboard.down("KeyW");
  const fps = await page.evaluate(() => window.__pauWorld.fps(4000));
  await page.keyboard.up("KeyW");
  const stats = await page.evaluate(() => window.__pauWorld.stats());
  out.tiers[q] = { fps: Math.round(fps * 10) / 10, frameMs: Math.round(10000 / fps) / 10, ...stats };
}
console.log(JSON.stringify(out, null, 2));
await browser.close();
