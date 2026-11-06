const request = require("supertest");
const { createTestApp, cleanupTestApp, datasetPath } = require("./testApp");

// Regression test for a production incident: a missing SESSION_SECRET in
// production used to throw from config.js at require-time, which crashed
// every request the function received - including fully public ones that
// have nothing to do with admin auth. The fix moved that check into
// server/services/adminToken.js, called lazily only when a token is
// actually signed or verified, so only admin-auth routes fail (and do so
// as a normal 500, not a dead function) while the public app keeps working.
describe("misconfigured SESSION_SECRET in production", () => {
  let app, tmpDir;

  beforeEach(async () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "";
    ({ app, tmpDir } = await createTestApp());
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECRET;
    cleanupTestApp(tmpDir);
  });

  it("still serves a public route", async () => {
    const res = await request(app).get(datasetPath("/timeline"));
    expect(res.status).toBe(200);
  });

  it("fails closed (not a crashed function) on an admin-auth route", async () => {
    // A successful login is the first point that actually signs a token
    // (verify() short-circuits before touching the secret when there's no
    // cookie to check at all, e.g. a plain GET /api/auth/me).
    const res = await request(app).post("/api/auth/login").send({ password: "test-password" });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/SESSION_SECRET/);
  });
});
