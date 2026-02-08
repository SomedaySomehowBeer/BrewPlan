import { chromium, type FullConfig } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_STATE_PATH, TEST_CREDENTIALS } from "./helpers/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "brewplan-test.db");
const rootDir = path.resolve(__dirname, "../../..");

export default async function globalSetup(_config: FullConfig) {
  // 1. Clean up old test DB
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = testDbPath + suffix;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  // 2. Seed fresh test database
  execSync("pnpm db:migrate && pnpm db:seed", {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: testDbPath },
    stdio: "inherit",
  });

  // 3. Login and save storageState
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:5173/login");
  await page.getByLabel("Email").fill(TEST_CREDENTIALS.email);
  await page.getByLabel("Password").fill(TEST_CREDENTIALS.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("http://localhost:5173/", { timeout: 15_000 });

  // Ensure auth dir exists
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });

  await browser.close();
}
