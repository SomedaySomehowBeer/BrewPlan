import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VIEWER_STORAGE_STATE = path.resolve(
  __dirname,
  "../.auth/viewer.json"
);

test("admin sees Users and Settings in nav", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator("nav");
  await expect(nav.getByText("Users")).toBeVisible();
  await expect(nav.getByText("Settings")).toBeVisible();
});

test("admin can access user management", async ({ page }) => {
  await page.goto("/users");
  await expect(page.locator("main").getByRole("heading", { name: "Users" })).toBeVisible();
});

test("viewer cannot see Users or Settings in nav", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: VIEWER_STORAGE_STATE,
  });
  const page = await context.newPage();

  await page.goto("/");
  const nav = page.locator("nav");
  await expect(nav.getByText("Recipes")).toBeVisible();
  await expect(nav.getByText("Users")).not.toBeVisible();
  await expect(nav.getByText("Settings")).not.toBeVisible();

  await context.close();
});

test("viewer is blocked from accessing user management", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: VIEWER_STORAGE_STATE,
  });
  const page = await context.newPage();

  const response = await page.goto("/users");
  expect(response?.status()).toBe(403);

  await context.close();
});
