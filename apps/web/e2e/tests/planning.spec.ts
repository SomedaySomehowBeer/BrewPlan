import { test, expect } from "@playwright/test";

test("displays planning dashboard cards", async ({ page }) => {
  await page.goto("/planning");

  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Planned Batches" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Low Stock Items" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Vessels Available" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Orders Due" })).toBeVisible();
});

test("navigates to materials requirements", async ({ page }) => {
  await page.goto("/planning");

  await page.locator("main").getByText("Materials Requirements").click();
  await expect(page).toHaveURL(/\/planning\/materials/);
});

test("navigates to brew schedule", async ({ page }) => {
  await page.goto("/planning");

  await page.locator("main").getByText("Brew Schedule").click();
  await expect(page).toHaveURL(/\/planning\/schedule/);
});

test("navigates to customer demand", async ({ page }) => {
  await page.goto("/planning");

  await page.locator("main").getByText("Customer Demand").click();
  await expect(page).toHaveURL(/\/planning\/demand/);
});
