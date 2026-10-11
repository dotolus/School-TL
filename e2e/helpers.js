async function login(page, password = "e2e-test-password") {
  await page.goto("/admin");
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "התחברות" }).click();
}

async function addItemViaAdmin(page, { title, short = "1.1", full = "1.1.2027", m = "1", y = "2027" }) {
  await page.getByRole("button", { name: "+ פריט חדש" }).click();
  await page.getByLabel("חודש (1-12)").fill(m);
  await page.getByLabel("שנה").fill(y);
  await page.getByLabel("כותרת").fill(title);
  await page.getByLabel("תאריך קצר (על הציר)").fill(short);
  await page.getByLabel("תאריך מלא (בפרטים)").fill(full);
  await page.getByRole("button", { name: "הוספה" }).click();
}

module.exports = { login, addItemViaAdmin };
