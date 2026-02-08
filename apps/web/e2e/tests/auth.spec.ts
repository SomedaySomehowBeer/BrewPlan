import { test, expect } from "@playwright/test";
import { TEST_CREDENTIALS } from "../helpers/auth";

// Auth tests do NOT use storageState — they test unauthenticated flows
test.use({ storageState: { cookies: [], origins: [] } });

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("logs in with valid credentials", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TEST_CREDENTIALS.email);
  await page.getByLabel("Password").fill(TEST_CREDENTIALS.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("shows error for invalid credentials", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("wrong@example.com");
  await page.getByLabel("Password").fill("wrongpassword");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
