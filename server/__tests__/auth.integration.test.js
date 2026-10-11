const request = require("supertest");
const { createTestApp, cleanupTestApp } = require("./testApp");

let app, tmpDir;

beforeEach(() => {
  ({ app, tmpDir } = createTestApp());
});

afterEach(() => {
  cleanupTestApp(tmpDir);
});

describe("auth", () => {
  it("rejects a mutating route with no session", async () => {
    const res = await request(app).post("/api/timeline/items").send({});
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
      .post("/api/timeline/items")
      .send({ type: "notice", m: 1, y: 2027, title: "t", short: "1.1", full: "1.1.2027" });
    expect(res.status).toBe(201);
  });
});
