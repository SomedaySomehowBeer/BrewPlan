import { test, expect } from "@playwright/test";

test("lists seeded inventory items", async ({ page }) => {
  await page.goto("/inventory");

  const main = page.locator("main");
  await expect(main.getByText("Millet Malt")).toBeVisible();
  await expect(main.getByText("Cascade Hops")).toBeVisible();
  await expect(main.getByText("Safale US-05")).toBeVisible();
});

test("creates a new inventory item", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/inventory/new");

  await page.getByLabel("Item Name").fill(`Test Grain ${suffix}`);
  await page.getByRole("button", { name: "Create Item" }).click();

  // Should redirect to the item detail page
  await expect(page).toHaveURL(/\/inventory\/.+/);
  await expect(page.locator("main").getByText(`Test Grain ${suffix}`)).toBeVisible();
});

test("views inventory item detail with lots", async ({ page }) => {
  await page.goto("/inventory");

  const main = page.locator("main");
  await main.getByText("Millet Malt").first().click();
  await expect(page).toHaveURL(/\/inventory\/.+/);
  await expect(main.getByText("Millet Malt").first()).toBeVisible();

  // Navigate to Lots tab to see lot numbers
  await main.getByRole("link", { name: "Lots" }).click();
  await expect(page).toHaveURL(/\/inventory\/.+\/lots/);
  // Seed has lot MM-2026-001 linked to Millet Malt (scope to table for desktop view)
  await expect(main.locator("table").getByText("MM-2026-001")).toBeVisible();
});
