const request = require("supertest");
const { createTestApp, cleanupTestApp } = require("./testApp");

describe("dynamic OG/meta tags on page requests", () => {
  let app, tmpDir;
  beforeEach(async () => {
    ({ app, tmpDir } = await createTestApp());
  });
  afterEach(() => cleanupTestApp(tmpDir));

  it("renders dataset-scoped title/description for the viewer path", async () => {
    const res = await request(app).get("/reut/2026-2027/e4");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>ציר שנת הלימודים – בית ספר reut, כיתה e4</title>");
    expect(res.text).toContain(
      'content="לוח האירועים, החגים והמבחנים של בית ספר reut, כיתה e4, שנת הלימודים 2026-2027"'
    );
  });

  it("renders the same dynamic meta for the admin path", async () => {
    const res = await request(app).get("/reut/2026-2027/e4/admin");
    expect(res.text).toContain("בית ספר reut, כיתה e4");
  });

  it("renders the generic fallback for the bare root", async () => {
    const res = await request(app).get("/");
    expect(res.text).toContain("<title>ציר שנת הלימודים</title>");
    expect(res.text).toContain("לוח אירועים, חגים ומבחנים לאורך שנת הלימודים");
  });

  it("uses an absolute URL for og:image and og:url", async () => {
    const res = await request(app).get("/reut/2026-2027/e4");
    expect(res.text).toMatch(/property="og:image" content="https?:\/\/[^"]+\/og-image\.jpg"/);
    expect(res.text).toMatch(/property="og:url" content="https?:\/\/[^"]+\/reut\/2026-2027\/e4"/);
  });

  it("escapes a crafted class segment instead of reflecting it raw", async () => {
    // No literal "/" in the payload - a real "</script>" would split the
    // URL into an extra path segment before it ever reaches our regex,
    // which is a property of URLs, not of the escaping logic under test.
    const res = await request(app).get('/reut/2026-2027/"><img src=x onerror=alert(1)>');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("<img src=x onerror=alert(1)>");
    expect(res.text).toContain("&lt;img");
  });
});
