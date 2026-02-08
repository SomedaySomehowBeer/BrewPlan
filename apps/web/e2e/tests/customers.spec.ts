import { test, expect } from "@playwright/test";

test("lists seeded customers", async ({ page }) => {
  await page.goto("/customers");

  const table = page.locator("main table");
  await expect(table.getByText("The Eagle Bar")).toBeVisible();
  await expect(table.getByText("Vasse Valley Wines & Beer")).toBeVisible();
  await expect(table.getByText("Margaret River Markets")).toBeVisible();
  await expect(table.getByText("Taproom Walk-in")).toBeVisible();
});

test("creates a new customer", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/customers/new");

  await page.getByLabel("Customer Name").fill(`Test Customer ${suffix}`);
  await page.locator("#customerType").selectOption("venue");
  await page.getByRole("button", { name: "Create Customer" }).click();

  await expect(page).toHaveURL(/\/customers\/.+/);
  await expect(page.locator("main").getByText(`Test Customer ${suffix}`)).toBeVisible();
});

test("views customer detail page", async ({ page }) => {
  await page.goto("/customers");

  const main = page.locator("main");
  await main.locator("table").getByRole("link", { name: "The Eagle Bar" }).click();
  await expect(page).toHaveURL(/\/customers\/.+/);
  await expect(main.getByText("The Eagle Bar").first()).toBeVisible();
  await expect(main.getByText("James O'Brien").first()).toBeVisible();
});
