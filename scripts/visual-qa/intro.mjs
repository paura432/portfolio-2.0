// Usage: node scripts/visual-qa/intro.mjs <outDir> [base] — intro screen, desktop and phone.
import { chromium } from "@playwright/test";
const [out, base = "http://127.0.0.1:3101"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await d.goto(base + "/"); await d.waitForTimeout(900);
await d.screenshot({ path: `${out}/01-intro-desktop.png` });
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto(base + "/"); await m.waitForTimeout(900);
await m.screenshot({ path: `${out}/02-intro-mobile.png` });
await browser.close();
