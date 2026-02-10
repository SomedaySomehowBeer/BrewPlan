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

  // Click Draft tab — seed recipes should not appear (they are active)
  await main.getByRole("tab", { name: "Draft" }).click();
  await expect(main.getByText("GF Pale Ale")).not.toBeVisible();
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

test("clones recipe as new version", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");
  await main.getByRole("link", { name: /GF Pale Ale/ }).first().click();
  await expect(page).toHaveURL(/\/recipes\/.+/);

  // Clone the recipe
  await main.getByRole("button", { name: "Clone as New Version" }).click();

  // Should redirect to the new cloned recipe
  await expect(page).toHaveURL(/\/recipes\/.+/);
  await expect(main.getByText("GF Pale Ale")).toBeVisible();
  await expect(main.getByText(/v\d+/)).toBeVisible();
});

test("shows version history", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");
  await main.getByRole("link", { name: /GF Pale Ale/ }).first().click();

  // Navigate to Versions tab
  await main.getByRole("link", { name: "Versions" }).click();
  await expect(page).toHaveURL(/\/recipes\/.+\/versions/);
  await expect(main.getByText("Version History")).toBeVisible();
});

test("shows process steps tab", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");
  await main.getByRole("link", { name: /GF Pale Ale/ }).first().click();

  // Navigate to Process tab
  await main.getByRole("link", { name: "Process" }).click();
  await expect(page).toHaveURL(/\/recipes\/.+\/process/);
  await expect(main.getByText("Add Process Step")).toBeVisible();
  // Should show seeded process steps
  await expect(main.getByRole("heading", { name: /Process Steps/ })).toBeVisible();
});

test("adds a process step to a recipe", async ({ page }) => {
  await page.goto("/recipes");

  const main = page.locator("main");
  await main.getByRole("link", { name: /GF Session IPA/ }).first().click();
  await main.getByRole("link", { name: "Process" }).click();

  // Fill in the process step form
  await main.locator("button").filter({ hasText: "Select stage" }).click();
  await page.getByRole("option", { name: "Mash" }).click();
  await main.getByLabel("Duration (min)").fill("60");
  await main.getByLabel(/Temp/).fill("65");
  await main.getByLabel("Instruction *").fill("E2E test mash step");

  await main.getByRole("button", { name: "Add Step" }).click();

  // Should show the new step
  await expect(main.getByText("E2E test mash step")).toBeVisible();
});
