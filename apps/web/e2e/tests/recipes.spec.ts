import { test, expect } from "@playwright/test";

test("lists seeded recipes", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");
  await expect(main.getByText("GF Pale Ale")).toBeVisible();
  await expect(main.getByText("GF Session IPA")).toBeVisible();
  await expect(main.getByText("GF Golden Lager")).toBeVisible();
});

test("filters recipes by status tab", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");

  // Click Active tab — all 3 seed recipes are active
  await main.getByRole("tab", { name: "Active" }).click();
  await expect(main.getByText("GF Pale Ale")).toBeVisible();

  // Click Draft tab — should show empty state
  await main.getByRole("tab", { name: "Draft" }).click();
  await expect(main.getByText("No draft recipes yet")).toBeVisible();
});

test("creates a new recipe", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/recipes/new");

  await page.getByLabel("Recipe Name").fill(`Test Recipe ${suffix}`);
  await page.getByLabel("Style").fill("Test Style");
  await page.getByLabel("Batch Size (L)").fill("25");
  await page.getByRole("button", { name: "Create Recipe" }).click();

  // Should redirect to the recipe detail page
  await expect(page).toHaveURL(/\/recipes\/.+/);
  await expect(page.locator("main").getByText(`Test Recipe ${suffix}`)).toBeVisible();
});

test("views recipe detail page", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");
  await main.getByRole("link", { name: /GF Pale Ale/ }).first().click();
  await expect(page).toHaveURL(/\/recipes\/.+/);
  await expect(main.getByText("GF Pale Ale")).toBeVisible();
  await expect(main.getByText("American Pale Ale")).toBeVisible();
});
