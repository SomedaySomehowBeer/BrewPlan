import { test, expect } from "@playwright/test";

test("lists seeded suppliers", async ({ page }) => {
  await page.goto("/suppliers");

  const table = page.locator("main table");
  await expect(table.getByText("Grouse Malting")).toBeVisible();
  await expect(table.getByText("Hopco Australia")).toBeVisible();
  await expect(table.getByText("YeastWest")).toBeVisible();
});

test("creates a new supplier", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/suppliers/new");

  await page.getByLabel("Supplier Name").fill(`Test Supplier ${suffix}`);
  await page.getByRole("button", { name: "Create Supplier" }).click();

  await expect(page).toHaveURL(/\/suppliers\/.+/);
  await expect(page.locator("main").getByText(`Test Supplier ${suffix}`)).toBeVisible();
});

test("views supplier detail with linked items", async ({ page }) => {
  await page.goto("/suppliers");

  const main = page.locator("main");
  await main.locator("table").getByRole("link", { name: "Grouse Malting" }).click();
  await expect(page).toHaveURL(/\/suppliers\/.+/);
  await expect(main.getByText("Grouse Malting").first()).toBeVisible();
  await expect(main.getByText("Sarah Mitchell")).toBeVisible();
});
