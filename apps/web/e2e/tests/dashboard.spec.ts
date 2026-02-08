import { test, expect } from "@playwright/test";

test("displays stat cards on dashboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const main = page.locator("main");
  // Stat cards have heading level 3 with unique titles
  await expect(main.getByRole("heading", { name: "Active Recipes" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Active Batches" }).first()).toBeVisible();
  await expect(main.getByRole("heading", { name: "Vessels Available" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Low Stock Items" })).toBeVisible();
});

test("lists active batches", async ({ page }) => {
  await page.goto("/");

  const main = page.locator("main");
  await expect(main.getByText("BP-2026-001")).toBeVisible();
  await expect(main.getByText("BP-2026-002")).toBeVisible();
});
