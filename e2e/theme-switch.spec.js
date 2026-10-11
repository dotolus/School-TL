const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

async function bodyBackground(page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test("switching the active theme in admin changes the viewer's background color", async ({ page }) => {
  await page.goto("/");
  const lightBg = await bodyBackground(page);

  await login(page);
  await page.getByRole("button", { name: "Dark" }).click();

  await page.goto("/");
  // ThemeProvider applies the active theme's vars asynchronously after
  // its own GET /api/themes resolves - wait for the actual effect
  // (background changing) rather than racing page.goto()'s load event.
  await expect
    .poll(() => bodyBackground(page))
    .not.toBe(lightBg);

  // switch back so other specs aren't affected by run order
  await page.goto("/admin");
  await page.getByRole("button", { name: "Paper (light)" }).click();
});
