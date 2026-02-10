import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleJsonPath = path.resolve(
  __dirname,
  "../../../../docs/brewfather_export_sample.json"
);

test("shows import form and handles empty submission", async ({ page }) => {
  await page.goto("/recipes/import");

  const main = page.locator("main");
  await expect(
    main.getByRole("heading", { name: "Import from Brewfather" })
  ).toBeVisible();
  await expect(main.getByText("Paste Brewfather JSON")).toBeVisible();

  // Submit empty form
  await main.getByRole("button", { name: "Preview Import" }).click();
  await expect(main.getByText("Please paste Brewfather JSON data")).toBeVisible();
});

test("previews Brewfather JSON before importing", async ({ page }) => {
  await page.goto("/recipes/import");

  const main = page.locator("main");
  const sampleJson = fs.readFileSync(sampleJsonPath, "utf-8");

  await main.getByLabel("Recipe JSON").fill(sampleJson);
  await main.getByRole("button", { name: "Preview Import" }).click();

  // Should show preview with parsed recipe details
  await expect(main.getByText("Import Preview")).toBeVisible();
  await expect(main.getByText("High Quinoa Brew")).toBeVisible();
  await expect(main.getByText("500 L")).toBeVisible();

  // Should show fermentables section
  await expect(main.getByText(/Fermentables/)).toBeVisible();
  await expect(main.getByText("Unmalted Whole Quinoa")).toBeVisible();
});

test("imports Brewfather recipe and redirects to recipe detail", async ({
  page,
}) => {
  await page.goto("/recipes/import");

  const main = page.locator("main");
  const sampleJson = fs.readFileSync(sampleJsonPath, "utf-8");

  await main.getByLabel("Recipe JSON").fill(sampleJson);
  await main.getByRole("button", { name: "Preview Import" }).click();

  // Wait for preview
  await expect(main.getByText("Import Preview")).toBeVisible();

  // Confirm import
  await main.getByRole("button", { name: "Import Recipe" }).click();

  // Should redirect to the new recipe detail
  await expect(page).toHaveURL(/\/recipes\/.+/);
  await expect(main.getByText("High Quinoa Brew")).toBeVisible();
});
