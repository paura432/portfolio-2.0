// Usage: node scripts/visual-qa/copycheck.mjs <outDir> [base]
// Editorial check: the intro, the hub (profile) panel, a project panel, the contact page and the 4Geeks page at desktop and phone widths,
// plus a scan for text overflow (elements whose scrollWidth exceeds their clientWidth) on each screen.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? "docs/editorial/screens";
const base = process.argv[3] ?? "http://127.0.0.1:3102";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const overflow = (page) => page.evaluate(() => [...document.querySelectorAll("main *, [role=dialog] *")].filter((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0 && el.innerText && el.innerText.trim().length > 0 && el.children.length === 0).map((el) => `${el.tagName.toLowerCase()}: ${el.innerText.trim().slice(0, 60)}`));
for (const [name, viewport] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: name === "phone", hasTouch: name === "phone" });
  const page = await context.newPage();
  const shot = async (label) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}-${label}.png`, fullPage: true }); const o = await overflow(page); console.log(name, label, o.length ? "OVERFLOW " + JSON.stringify(o) : "ok"); };
  await page.goto(base + "/");
  await page.getByTestId("explore").waitFor();
  await shot("intro");
  await page.goto(base + "/projects");
  await shot("projects");
  await page.goto(base + "/projects/duplex");
  await shot("duplex");
  await page.goto(base + "/projects/ovi");
  await shot("ovi");
  await page.goto(base + "/contact");
  await shot("contact");
  await page.goto(base + "/education/4geeks");
  await shot("4geeks");
  // In-game: hub panel (profile with the new Education list) via the menu.
  await page.goto(base + "/");
  await page.getByTestId("explore").click();
  await page.waitForFunction(() => typeof window.__pauWorld === "object");
  await page.waitForSelector("[data-testid=loading]", { state: "hidden", timeout: 30000 });
  await page.evaluate(() => window.__pauWorld.setQuality("low", true));
  await page.getByTestId("open-menu").click();
  await page.getByTestId("projects-menu").waitFor();
  await shot("menu");
  await page.getByRole("button", { name: /^Central Hub/ }).click();
  await page.getByTestId("project-panel").waitFor();
  await shot("hub-panel");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await shot("hud-car");
  await context.close();
}
await browser.close();
