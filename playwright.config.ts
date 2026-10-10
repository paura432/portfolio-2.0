import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;
const GL_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Software WebGL is CPU-bound: one worker keeps frame times (and the drive-until checks) stable.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], launchOptions: { args: GL_ARGS } },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      // Pixel-class phone: touch, coarse pointer, portrait by default.
      use: { ...devices["Pixel 7"], launchOptions: { args: GL_ARGS } },
    },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
