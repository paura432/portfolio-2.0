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
const cams = {
  rear: { position: [0, 2.6, 34.5], target: [0, 0.9, 27], fov: 42 },
  side: { position: [7.5, 1.9, 27], target: [0, 0.8, 27], fov: 42 },
  tq: { position: [5.2, 2.8, 32.8], target: [0, 0.75, 27], fov: 42 },
  front: { position: [-4.5, 2.2, 21.5], target: [0, 0.75, 27], fov: 42 },
  top: { position: [0.5, 9, 27.5], target: [0, 0, 27], fov: 42 },
};
for (const [name, cam] of Object.entries(cams)) {
  await page.evaluate((c) => window.__pauWorld.photo(c), cam);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/car-${name}.png` });
}
await browser.close();
