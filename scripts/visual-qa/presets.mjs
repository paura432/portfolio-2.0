// Usage: node .probe/presets.mjs <outDir> [baseURL]  — same camera, three lighting presets.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [out, base = "http://127.0.0.1:3101"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + "/");
await page.getByRole("button", { name: /explore/i }).click();
await page.waitForFunction(() => typeof window.__pauWorld === "object");
await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
await page.evaluate(() => window.__pauWorld.setQuality("high", true));
await page.addStyleTag({ content: ".pointer-events-none, [role=status] { display: none !important; }" });
await page.evaluate(() => window.__pauWorld.teleport(0, 27, Math.PI));
for (const [name, cam] of [
  ["hub", { position: [17, 9, 24], target: [0, 4, 0], fov: 45 }],
  ["duplex", { position: [-12, 8, 10], target: [-28, 4.5, -17], fov: 45 }],
  ["drive", { position: [0, 7.5, 40], target: [0, 1.4, 20], fov: 50 }],
]) {
  await page.evaluate((c) => window.__pauWorld.photo(c), cam);
  for (const preset of ["night-cinematic", "blue-hour", "soft-dusk"]) {
    await page.evaluate((p) => window.__pauWorld.setLighting(p), preset);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${name}-${preset}.png` });
    console.log("shot", name, preset);
  }
}
await browser.close();
