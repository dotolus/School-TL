const request = require("supertest");
const { createTestApp, cleanupTestApp, datasetPath } = require("./testApp");

let app, tmpDir;

beforeEach(async () => {
  ({ app, tmpDir } = await createTestApp());
});

afterEach(() => {
  cleanupTestApp(tmpDir);
});

describe("auth", () => {
  it("rejects a mutating route with no session", async () => {
    const res = await request(app).post(datasetPath("/timeline/items")).send({});
    expect(res.status).toBe(401);
  });

  it("rejects the wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("logs in, reflects session via /me, then logs out and clears it", async () => {
    const agent = request.agent(app);

    let res = await agent.get("/api/auth/me");
    expect(res.body.isAdmin).toBe(false);

    res = await agent.post("/api/auth/login").send({ password: "test-password" });
    expect(res.status).toBe(200);

    res = await agent.get("/api/auth/me");
    expect(res.body.isAdmin).toBe(true);

    res = await agent.post("/api/auth/logout");
    expect(res.status).toBe(200);

    res = await agent.get("/api/auth/me");
    expect(res.body.isAdmin).toBe(false);
  });

  it("allows a mutating route once logged in", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ password: "test-password" });

    const res = await agent
      .post(datasetPath("/timeline/items"))
      .send({ type: "notice", m: 1, y: 2027, title: "t", short: "1.1", full: "1.1.2027" });
    expect(res.status).toBe(201);
  });

  it("rejects a session cookie whose sliding window has already expired", async () => {
    // The admin login state is a signed, stateless cookie (server/services/adminToken.js)
    // rather than a server-memory session, specifically so it survives a serverless
    // instance being recycled - see CLAUDE.md. A cookie that's simply too old must
    // still be rejected, same as the old "no session at all" case.
    const { sign } = require("../services/adminToken");
    const expiredToken = sign({ isAdmin: true }, -1);

    const res = await request(app)
      .post(datasetPath("/timeline/items"))
      .set("Cookie", `admin_token=${expiredToken}`)
      .send({ type: "notice", m: 1, y: 2027, title: "t", short: "1.1", full: "1.1.2027" });

    expect(res.status).toBe(401);
  });

  it("slides the session's expiry forward on every authenticated request", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ password: "test-password" });

    const { verify } = require("../services/adminToken");
    const extractExp = (res) => verify(res.headers["set-cookie"][0].split(";")[0].split("=")[1]).exp;

    const first = await agent.get(datasetPath("/history"));
    const firstExp = extractExp(first);

    await new Promise((r) => setTimeout(r, 20));

    const second = await agent.get(datasetPath("/history"));
    const secondExp = extractExp(second);

    expect(secondExp).toBeGreaterThan(firstExp);
  });
});
