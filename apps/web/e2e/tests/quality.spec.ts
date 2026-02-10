import { test, expect } from "@playwright/test";

test("navigates to quality checks from batch detail", async ({ page }) => {
  await page.goto("/batches");
  const main = page.locator("main");
  // Click on a batch
  await main.getByRole("link", { name: /BP-2026/ }).first().click();
  await expect(page).toHaveURL(/\/batches\/.+/);
  // Click quality check button
  await main.getByRole("link", { name: "Log Quality Check" }).click();
  await expect(page).toHaveURL(/\/batches\/.+\/quality/);
  await expect(
    main.getByRole("heading", { name: "Log Quality Check" })
  ).toBeVisible();
});

test("shows quality check form fields", async ({ page }) => {
  await page.goto("/batches");
  const main = page.locator("main");
  await main.getByRole("link", { name: /BP-2026/ }).first().click();
  await main.getByRole("link", { name: "Log Quality Check" }).click();
  await expect(main.getByLabel("pH")).toBeVisible();
  await expect(main.getByLabel("DO (ppm)")).toBeVisible();
  await expect(main.getByLabel("ABV %")).toBeVisible();
});

test("creates a quality check", async ({ page }) => {
  await page.goto("/batches");
  const main = page.locator("main");
  // Navigate to the fermenting batch (BP-2026-002)
  await main.getByRole("link", { name: /BP-2026-002/ }).click();
  await main.getByRole("link", { name: "Log Quality Check" }).click();

  // Fill in form
  await main.getByLabel("pH").fill("4.15");
  await main.getByLabel("ABV %").fill("4.8");
  await main.getByLabel("Notes", { exact: true }).fill("E2E test quality check");
  await main.getByLabel("Checked By").fill("Test User");

  // Select check type — click the trigger showing "Select type..."
  await main.locator("button").filter({ hasText: "Select type" }).click();
  await page.getByRole("option", { name: "Mid-Ferment" }).click();

  await main.getByRole("button", { name: "Log Quality Check" }).click();

  // Should show the logged check
  await expect(
    main.getByRole("cell", { name: "E2E test quality check" })
  ).toBeVisible();
});

test("displays existing quality checks for seeded batch", async ({ page }) => {
  await page.goto("/batches");
  const main = page.locator("main");
  await main.getByRole("link", { name: /BP-2026-002/ }).click();
  await main.getByRole("link", { name: "Log Quality Check" }).click();

  // Should show seeded quality checks
  await expect(
    main.getByRole("heading", { name: /Quality Checks/ })
  ).toBeVisible();
  await expect(main.getByRole("cell", { name: "Pass" }).first()).toBeVisible();
});
