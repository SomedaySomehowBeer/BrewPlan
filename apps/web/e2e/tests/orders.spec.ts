import { test, expect } from "@playwright/test";

test("lists seeded orders", async ({ page }) => {
  await page.goto("/orders");

  const table = page.locator("main table");
  await expect(table.getByText("The Eagle Bar")).toBeVisible();
  await expect(table.getByText("Draft")).toBeVisible();
});

test("creates a new order", async ({ page }) => {
  await page.goto("/orders/new");

  // Select the first customer
  await page.locator("#customerId").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Create Order" }).click();

  // Should redirect to the order detail page
  await expect(page).toHaveURL(/\/orders\/.+/);
  await expect(page.locator("main").getByText(/ORD-/)).toBeVisible();
});

test("views order detail with order lines", async ({ page }) => {
  await page.goto("/orders");

  const main = page.locator("main");
  // Navigate via order number link in the desktop table
  await main.locator("table").getByRole("link", { name: /ORD-2026-001/ }).click();
  await expect(page).toHaveURL(/\/orders\/.+/);
  // Seed order has lines for GF Pale Ale and GF Session IPA (scope to table for desktop view)
  const orderTable = main.locator("table");
  await expect(orderTable.getByText("GF Pale Ale")).toBeVisible();
  await expect(orderTable.getByText("GF Session IPA")).toBeVisible();
});

test("transitions order from draft to confirmed", async ({ page }) => {
  await page.goto("/orders");

  const main = page.locator("main");
  await main.locator("table").getByRole("link", { name: /ORD-2026-001/ }).click();

  // Draft order should have "Confirm Order" button
  await expect(
    page.getByRole("button", { name: "Confirm Order" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm Order" }).click();

  // Should stay on detail page, status should update
  await expect(page).toHaveURL(/\/orders\/.+/);
  await expect(main.getByText("Confirmed").first()).toBeVisible();
});
