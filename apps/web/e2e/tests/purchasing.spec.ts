import { test, expect } from "@playwright/test";

test("lists seeded purchase orders", async ({ page }) => {
  await page.goto("/purchasing");

  const table = page.locator("main table");
  await expect(table.getByText("Grouse Malting")).toBeVisible();
  await expect(table.getByText("Draft")).toBeVisible();
});

test("creates a new purchase order", async ({ page }) => {
  await page.goto("/purchasing/new");

  // Select the first supplier
  await page.locator("#supplierId").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Create Purchase Order" }).click();

  // Should redirect to the PO detail page
  await expect(page).toHaveURL(/\/purchasing\/.+/);
  await expect(page.locator("main").getByText(/PO-/)).toBeVisible();
});

test("views PO detail with order lines", async ({ page }) => {
  await page.goto("/purchasing");

  const main = page.locator("main");
  // Navigate via PO number link (link text is PO number, not supplier name)
  await main.locator("table").getByRole("link", { name: /PO-2026-001/ }).click();
  await expect(page).toHaveURL(/\/purchasing\/.+/);
  // The seed PO has lines for Millet Malt and Buckwheat Malt (scope to table for desktop view)
  const poTable = main.locator("table");
  await expect(poTable.getByText("Millet Malt")).toBeVisible();
  await expect(poTable.getByText("Buckwheat Malt")).toBeVisible();
});

test("transitions PO from draft to sent", async ({ page }) => {
  await page.goto("/purchasing");

  const main = page.locator("main");
  await main.locator("table").getByRole("link", { name: /PO-2026-001/ }).click();

  // Draft PO should have "Mark Sent" button
  await expect(
    page.getByRole("button", { name: "Mark Sent" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark Sent" }).click();

  // Should stay on detail page, status should update
  await expect(page).toHaveURL(/\/purchasing\/.+/);
  await expect(main.getByText("Sent").first()).toBeVisible();
});
