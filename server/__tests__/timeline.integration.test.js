const request = require("supertest");
const { createTestApp, cleanupTestApp } = require("./testApp");

let app, tmpDir, agent;

beforeEach(async () => {
  ({ app, tmpDir } = createTestApp());
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({ password: "test-password" });
});

afterEach(() => {
  cleanupTestApp(tmpDir);
});

const validItem = (overrides = {}) => ({
  type: "test",
  m: 3,
  y: 2027,
  title: "Math test",
  short: "16.3",
  full: "Tuesday, 16.3.2027",
  ...overrides,
});

describe("GET /api/timeline", () => {
  it("is public and starts empty", async () => {
    const res = await request(app).get("/api/timeline");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});

describe("timeline CRUD", () => {
  it("full add -> update -> delete cycle", async () => {
    let res = await agent.post("/api/timeline/items").send(validItem());
    expect(res.status).toBe(201);
    const id = res.body.id;

    res = await request(app).get("/api/timeline");
    expect(res.body.items).toHaveLength(1);

    res = await agent.put(`/api/timeline/items/${id}`).send(validItem({ title: "Updated" }));
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated");

    res = await agent.delete(`/api/timeline/items/${id}`);
    expect(res.status).toBe(204);

    res = await request(app).get("/api/timeline");
    expect(res.body.items).toHaveLength(0);
  });

  it("rejects an invalid payload with a 400 and an error message", async () => {
    const res = await agent.post("/api/timeline/items").send(validItem({ type: "bogus" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type must be one of/);
  });

  it("404s updating/deleting a nonexistent item", async () => {
    let res = await agent.put("/api/timeline/items/does-not-exist").send(validItem());
    expect(res.status).toBe(404);

    res = await agent.delete("/api/timeline/items/does-not-exist");
    expect(res.status).toBe(404);
  });
});
