import { test, expect } from "@playwright/test";

test("lists users including seeded accounts", async ({ page }) => {
  await page.goto("/users");

  const main = page.locator("main");
  await expect(
    main.getByRole("heading", { name: "Users" })
  ).toBeVisible();
  await expect(main.getByText("admin@brewplan.local")).toBeVisible();
  await expect(main.getByText("brewer@brewplan.local")).toBeVisible();
  await expect(main.getByText("viewer@brewplan.local")).toBeVisible();
});

test("creates a new user", async ({ page }) => {
  await page.goto("/users/new");

  const main = page.locator("main");
  await main.getByLabel("Name").fill("E2E Test User");
  await main.getByLabel("Email").fill("e2etest@brewplan.local");
  await main.getByLabel("Password").fill("testpass123");
  await main.getByLabel("Role").selectOption("viewer");
  await main.getByRole("button", { name: "Create User" }).click();

  // Should redirect to user detail
  await expect(page).toHaveURL(/\/users\/.+/);
  await expect(main.getByText("E2E Test User")).toBeVisible();
  await expect(main.getByText("Viewer", { exact: true }).first()).toBeVisible();
});

test("updates a user role", async ({ page }) => {
  await page.goto("/users");

  const main = page.locator("main");
  // Click the brewer user
  await main.getByText("Test Brewer").click();

  // Should be on user detail
  await expect(main.getByText("brewer@brewplan.local")).toBeVisible();

  // Change role to viewer
  await main.getByLabel("Role").selectOption("viewer");
  await main.getByRole("button", { name: "Save Changes" }).click();

  // Should show success
  await expect(main.getByText("User updated")).toBeVisible();
});

test("resets a user password", async ({ page }) => {
  await page.goto("/users");

  const main = page.locator("main");
  await main.getByText("Test Viewer").click();

  // Fill in the reset password form
  await main.getByLabel("New Password").fill("newpassword123");
  await main.getByRole("button", { name: "Reset Password" }).click();

  await expect(main.getByText("Password reset successfully")).toBeVisible();
});
