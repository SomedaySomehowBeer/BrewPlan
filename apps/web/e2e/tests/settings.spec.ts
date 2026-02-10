import { test, expect } from "@playwright/test";

test("displays brewery profile form", async ({ page }) => {
  await page.goto("/settings");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(main.getByLabel("Brewery Name *")).toBeVisible();
  await expect(
    main.getByLabel("Brewery Name *")
  ).toHaveValue("Someday Somehow Brewing");
});

test("updates brewery profile", async ({ page }) => {
  await page.goto("/settings");
  const main = page.locator("main");
  const nameInput = main.getByLabel("Brewery Name *");
  await nameInput.clear();
  await nameInput.fill("Test Brewery Updated");
  await main.getByRole("button", { name: "Save Settings" }).click();
  await expect(main.getByText("Settings saved successfully")).toBeVisible();
  await expect(nameInput).toHaveValue("Test Brewery Updated");

  // Restore original name
  await nameInput.clear();
  await nameInput.fill("Someday Somehow Brewing");
  await main.getByRole("button", { name: "Save Settings" }).click();
});

test("shows number prefix fields", async ({ page }) => {
  await page.goto("/settings");
  const main = page.locator("main");
  await expect(main.getByLabel("Batch Prefix")).toHaveValue("BP");
  await expect(main.getByLabel("Order Prefix")).toHaveValue("ORD");
  await expect(main.getByLabel("PO Prefix")).toHaveValue("PO");
});
