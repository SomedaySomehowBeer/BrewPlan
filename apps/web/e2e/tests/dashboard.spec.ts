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
  await expect(main.getByRole("heading", { name: "Orders Pending" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Revenue This Month" })).toBeVisible();
});

test("lists active batches", async ({ page }) => {
  await page.goto("/");

  const main = page.locator("main");
  await expect(main.getByText("BP-2026-001")).toBeVisible();
  await expect(main.getByText("BP-2026-002")).toBeVisible();
});

test("displays upcoming deliveries section", async ({ page }) => {
  await page.goto("/");

  const main = page.locator("main");
  await expect(
    main.getByRole("heading", { name: "Upcoming Deliveries" })
  ).toBeVisible();
});

test("displays quick-link buttons", async ({ page }) => {
  await page.goto("/");

  const main = page.locator("main");
  await expect(main.getByRole("link", { name: /Brew Schedule/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /Materials/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /Packaging Priority/ })).toBeVisible();
});
