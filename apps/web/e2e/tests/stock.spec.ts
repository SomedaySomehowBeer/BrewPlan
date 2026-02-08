import { test, expect } from "@playwright/test";

test("shows empty state when no finished goods exist", async ({ page }) => {
  await page.goto("/stock");

  await expect(
    page.getByText("No finished goods in stock")
  ).toBeVisible();
});
