import { test, expect } from "@playwright/test";

test("lists seeded vessels", async ({ page }) => {
  await page.goto("/vessels");

  const main = page.locator("main");
  await expect(main.getByText("FV1")).toBeVisible();
  await expect(main.getByText("FV2")).toBeVisible();
  await expect(main.getByText("FV3")).toBeVisible();
  // "Kettle" appears in both the vessel name and type, use .first()
  await expect(main.getByText("Kettle").first()).toBeVisible();
});

test("creates a new vessel", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/vessels/new");

  await page.getByLabel("Vessel Name").fill(`Test Vessel ${suffix}`);
  await page.locator("#vesselType").selectOption("fermenter");
  await page.getByLabel("Capacity (litres)").fill("100");
  await page.getByRole("button", { name: "Create Vessel" }).click();

  // Should redirect to the vessel detail page
  await expect(page).toHaveURL(/\/vessels\/.+/);
  await expect(page.locator("main").getByText(`Test Vessel ${suffix}`)).toBeVisible();
});

test("views vessel detail page", async ({ page }) => {
  await page.goto("/vessels");

  const main = page.locator("main");
  await main.getByText("FV1").click();
  await expect(page).toHaveURL(/\/vessels\/.+/);
  await expect(main.getByText("FV1")).toBeVisible();
  // Check vessel type displayed — "Fermenter" is shown in detail
  await expect(main.getByText("Fermenter").first()).toBeVisible();
});
