const { test, expect } = require("@playwright/test");

test("viewer loads with the masthead, legend, and jump button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ציר שנת הלימודים" })).toBeVisible();
  await expect(page.locator(".legend").getByText("חג / חופשה")).toBeVisible();
  await expect(page.getByRole("button", { name: "קפיצה לחודש הנוכחי" })).toBeVisible();
});
