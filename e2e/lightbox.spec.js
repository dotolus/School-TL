const path = require("path");
const { test, expect } = require("@playwright/test");
const { login, addItemViaAdmin } = require("./helpers");

test("uploading an image and opening/zooming/closing it in the viewer's lightbox", async ({ page }) => {
  const title = "פריט עם תמונה E2E";

  await login(page);
  await addItemViaAdmin(page, { title, short: "9.9", full: "9.9.2027", m: "9", y: "2027" });

  const row = page.locator(".admin-item-row", { hasText: title });
  await row.getByRole("button", { name: "ערוך" }).click();

  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles(path.join(__dirname, "fixtures", "test.png"));
  await page.getByRole("button", { name: "העלאה", exact: true }).click();
  await expect(page.locator(".image-thumb img")).toBeVisible();

  await page.goto("/");
  await page.getByText(title).click(); // opens the <details> card

  await page.locator(".image-thumb").click();
  await expect(page.locator(".lightbox-backdrop")).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();

  await page.getByText("+", { exact: true }).click();
  await expect(page.getByText("125%")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".lightbox-backdrop")).not.toBeVisible();
});
