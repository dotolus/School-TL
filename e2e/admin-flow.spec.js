const { test, expect } = require("@playwright/test");
const { login, addItemViaAdmin } = require("./helpers");

test("wrong password shows an error and does not log in", async ({ page }) => {
  await login(page, "totally-wrong");
  await expect(page.getByText("Wrong password")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ פריט חדש" })).not.toBeVisible();
});

test("logging in, adding an item, and seeing it on the public timeline", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "ניהול ציר שנת הלימודים" })).toBeVisible();
  await expect(page.locator(".admin-card .app-version").first()).toContainText(/v\d+\.\d+\.\d+/);

  await addItemViaAdmin(page, { title: "בדיקת E2E", short: "5.5", full: "5.5.2027", m: "5", y: "2027" });
  await expect(page.getByText("בדיקת E2E")).toBeVisible(); // shows in the admin item list

  await page.goto("/reut/2026-2027/e4");
  await expect(page.getByText("בדיקת E2E")).toBeVisible(); // and on the public viewer
});
