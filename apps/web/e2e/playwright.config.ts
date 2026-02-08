import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "brewplan-test.db");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "dot" : "list",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: "http://localhost:5173",
    storageState: "./e2e/.auth/user.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npx react-router dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    cwd: path.resolve(__dirname, ".."),
    env: {
      DATABASE_URL: testDbPath,
    },
    timeout: 30_000,
  },
});
