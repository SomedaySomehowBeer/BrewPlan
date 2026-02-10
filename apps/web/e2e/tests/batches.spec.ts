import { test, expect } from "@playwright/test";

test("lists seeded batches", async ({ page }) => {
  await page.goto("/batches");

  const main = page.locator("main");
  await expect(main.getByText("BP-2026-001")).toBeVisible();
  await expect(main.getByText("BP-2026-002")).toBeVisible();
});

test("creates a new batch", async ({ page }) => {
  await page.goto("/batches/new");

  // Select the first recipe
  await page.locator("#recipeId").selectOption({ index: 1 });
  await page.getByLabel("Batch Size (litres)").fill("30");
  await page.getByRole("button", { name: "Create Batch" }).click();

  // Should redirect to the batch detail page
  await expect(page).toHaveURL(/\/batches\/.+/);
  // New batch will have an auto-generated batch number
  const main = page.locator("main");
  await expect(main.getByText(/BP-2026-\d{3}/)).toBeVisible();
});

test("views batch detail page", async ({ page }) => {
  await page.goto("/batches");

  const main = page.locator("main");
  await main.getByRole("link", { name: /BP-2026-001/ }).first().click();
  await expect(page).toHaveURL(/\/batches\/.+/);
  await expect(main.getByText("BP-2026-001")).toBeVisible();
  await expect(main.getByText("GF Pale Ale").first()).toBeVisible();
});

test("transitions a planned batch to brewing", async ({ page }) => {
  await page.goto("/batches");
  const main = page.locator("main");
  await main.getByRole("link", { name: /BP-2026-001/ }).first().click();

  // The planned batch should have a "Start Brewing" button
  await expect(
    page.getByRole("button", { name: "Start Brewing" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Start Brewing" }).click();

  // Should stay on detail page, status should update
  await expect(page).toHaveURL(/\/batches\/.+/);
  await expect(main.getByText("Brewing").first()).toBeVisible();
});

test("transitions a planned batch directly to fermenting (shortcut)", async ({ page }) => {
  await page.goto("/batches");
  const main = page.locator("main");
  // BP-2026-003 is the planned batch seeded with OG + consumption for shortcut
  await main.getByRole("link", { name: /BP-2026-003/ }).first().click();

  // Verify we're on the right batch detail page
  await expect(main.getByRole("heading", { name: "BP-2026-003" })).toBeVisible();

  // The planned batch should have a "Move to Fermenter" button (shortcut)
  await expect(
    page.getByRole("button", { name: "Move to Fermenter" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Move to Fermenter" }).click();

  // Should stay on detail page, status should update to fermenting
  await expect(page).toHaveURL(/\/batches\/.+/);
  await expect(main.getByText("Fermenting").first()).toBeVisible();
});

test("CSV export link is available on batches list", async ({ page }) => {
  await page.goto("/batches");

  const main = page.locator("main");
  const csvLink = main.getByRole("link", { name: /CSV/ });
  await expect(csvLink).toBeVisible();
  await expect(csvLink).toHaveAttribute("href", "/batches/export");
});
