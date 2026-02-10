import { chromium, type FullConfig } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STORAGE_STATE_PATH,
  VIEWER_STORAGE_STATE_PATH,
  TEST_CREDENTIALS,
  VIEWER_CREDENTIALS,
} from "./helpers/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, "brewplan-test.db");
const rootDir = path.resolve(__dirname, "../../..");

async function loginAndSaveState(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T>
    ? T
    : never,
  credentials: { email: string; password: string },
  storagePath: string
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:5173/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("http://localhost:5173/", { timeout: 15_000 });

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  await context.storageState({ path: storagePath });
  await context.close();
}

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

  // 3. Login and save storageState for each role
  const browser = await chromium.launch();

  await loginAndSaveState(browser, TEST_CREDENTIALS, STORAGE_STATE_PATH);
  await loginAndSaveState(
    browser,
    VIEWER_CREDENTIALS,
    VIEWER_STORAGE_STATE_PATH
  );

  await browser.close();
}
