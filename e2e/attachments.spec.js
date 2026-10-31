const path = require("path");
const { test, expect } = require("@playwright/test");
const { login, addItemViaAdmin } = require("./helpers");

test("uploading an image and opening/zooming/closing it in the viewer's attachment preview", async ({ page }) => {
  const title = "פריט עם תמונה E2E";

  await login(page);
  await addItemViaAdmin(page, { title, short: "9.9", full: "9.9.2027", m: "9", y: "2027" });

  const row = page.locator(".admin-item-row", { hasText: title });
  await row.getByRole("button", { name: "ערוך" }).click();

  await page
    .locator(".admin-form input[type=\"file\"]")
    .setInputFiles(path.join(__dirname, "fixtures", "test.png"));
  await page.getByRole("button", { name: "העלאה", exact: true }).click();
  await expect(page.locator(".image-thumb img")).toBeVisible();

  await page.goto("/reut/2026-2027/e4");
  await page.getByText(title).click(); // opens the <details> card

  await page.locator(".image-thumb").click();
  await expect(page.locator(".lightbox-backdrop")).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();

  await page.getByText("+", { exact: true }).click();
  await expect(page.getByText("125%")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".lightbox-backdrop")).not.toBeVisible();
});

test("uploading a text file and previewing it (download-only chrome, no zoom)", async ({ page }) => {
  const title = "פריט עם קובץ טקסט E2E";

  await login(page);
  await addItemViaAdmin(page, { title, short: "9.10", full: "9.10.2027", m: "9", y: "2027" });

  const row = page.locator(".admin-item-row", { hasText: title });
  await row.getByRole("button", { name: "ערוך" }).click();

  await page
    .locator(".admin-form input[type=\"file\"]")
    .setInputFiles(path.join(__dirname, "fixtures", "test.txt"));
  await page.getByRole("button", { name: "העלאה", exact: true }).click();
  await expect(page.locator(".attachment-thumb")).toContainText("test.txt");

  await page.goto("/reut/2026-2027/e4");
  await page.getByText(title).click(); // opens the <details> card

  await page.getByText("תצוגה מקדימה").click();
  await expect(page.locator(".lightbox-backdrop")).toBeVisible();
  await expect(page.locator(".lightbox-frame iframe")).toBeVisible();
  await expect(page.getByText("100%")).not.toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".lightbox-backdrop")).not.toBeVisible();
});
