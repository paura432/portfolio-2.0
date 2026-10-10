// Regenerates public/preview/city.jpg and city-portrait.jpg from the real render (photo mode, high tier).
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:3101";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function shoot(viewport, cam, path, quality) {
  const page = await browser.newPage({ viewport });
  await page.goto(base + "/");
  await page.getByRole("button", { name: /explore/i }).click();
  await page.waitForFunction(() => typeof window.__pauWorld === "object");
  await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
  await page.evaluate(() => window.__pauWorld.setQuality("high", true));
  await page.addStyleTag({ content: ".pointer-events-none, [role=status] { display: none !important; }" });
  await page.evaluate(() => window.__pauWorld.teleport(-2, 24, Math.PI + 0.12));
  await page.evaluate((c) => window.__pauWorld.photo(c), cam);
  await page.waitForTimeout(1200);
  await page.screenshot({ path, type: "jpeg", quality });
  await page.close();
}
await shoot({ width: 1440, height: 900 }, { position: [-13, 8.5, 38], target: [3, 3.5, 2], fov: 48 }, "public/preview/city.jpg", 78);
await shoot({ width: 720, height: 900 }, { position: [-6, 10, 40], target: [1, 4, 0], fov: 58 }, "public/preview/city-portrait.jpg", 76);
await browser.close();
console.log("preview written");
