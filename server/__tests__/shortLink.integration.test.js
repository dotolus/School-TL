const request = require("supertest");
const { createTestApp, cleanupTestApp } = require("./testApp");

describe("short viewer link (no class segment)", () => {
  let app, tmpDir;
  beforeEach(async () => {
    ({ app, tmpDir } = await createTestApp());
  });
  afterEach(() => cleanupTestApp(tmpDir));

  it("redirects a school present in DEFAULT_CLASS_BY_SCHOOL to its default class", async () => {
    const res = await request(app).get("/reut/2026-2027");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/reut/2026-2027/e4");
  });

  it("falls through (no redirect, no error) for a school not in the map", async () => {
    const res = await request(app).get("/some-unknown-school/2026-2027");
    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
  });

  it("still serves a real two-segment static asset path instead of treating it as a school/period", async () => {
    const res = await request(app).get("/assets/app.js");
    expect(res.status).toBe(200);
    expect(res.text).toBe("console.log('fixture');");
  });
});
