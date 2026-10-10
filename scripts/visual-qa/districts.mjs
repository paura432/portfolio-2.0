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
const cams = {
  "17-broki": { position: [12, 9, -6], target: [28, 4, 17], fov: 45 },
  "18-trustos": { position: [-12, 10, -7], target: [-28, 5, 17], fov: 45 },
  "19-fortytwo": { position: [-14, 8, -40], target: [0, 4, -57], fov: 45 },
  "20-contact": { position: [14, 8, 40], target: [0, 4, 57], fov: 45 },
  "12-aerial": { position: [0, 92, 72], target: [0, 0, -4], fov: 50 },
  "12b-aerial-low": { position: [-70, 40, 80], target: [0, 2, 0], fov: 45 },
};
for (const [name, cam] of Object.entries(cams)) {
  await page.evaluate((c) => window.__pauWorld.photo(c), cam);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
