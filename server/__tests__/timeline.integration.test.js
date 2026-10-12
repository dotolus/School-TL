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

describe("POST /api/timeline/import", () => {
  const asFile = (payload) => Buffer.from(JSON.stringify(payload), "utf8");

  it("accepts the shape returned by GET /api/timeline and creates new items", async () => {
    const res = await agent
      .post("/api/timeline/import")
      .attach("file", asFile({ items: [validItem(), validItem({ title: "second" })] }), "data.json");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ created: 2, updated: 0 });

    const list = await request(app).get("/api/timeline");
    expect(list.body.items).toHaveLength(2);
  });

  it("also accepts a bare array of items", async () => {
    const res = await agent
      .post("/api/timeline/import")
      .attach("file", asFile([validItem()]), "data.json");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ created: 1, updated: 0 });
  });

  it("updates existing items whose id matches and creates the rest", async () => {
    const created = await agent.post("/api/timeline/items").send(validItem({ title: "original" }));
    const id = created.body.id;

    const res = await agent.post("/api/timeline/import").attach(
      "file",
      asFile({
        items: [
          { ...validItem({ title: "updated" }), id },
          validItem({ title: "new one" }),
        ],
      }),
      "data.json"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ created: 1, updated: 1 });

    const list = await request(app).get("/api/timeline");
    expect(list.body.items).toHaveLength(2);
    expect(list.body.items.find((it) => it.id === id).title).toBe("updated");
  });

  it("imports nothing and reports per-item errors when any item is invalid", async () => {
    const res = await agent
      .post("/api/timeline/import")
      .attach("file", asFile({ items: [validItem(), validItem({ type: "bogus" })] }), "data.json");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Import validation failed/);
    expect(res.body.details).toEqual([{ index: 1, error: expect.stringMatching(/type must be one of/) }]);

    const list = await request(app).get("/api/timeline");
    expect(list.body.items).toHaveLength(0);
  });

  it("rejects a non-JSON file", async () => {
    const res = await agent
      .post("/api/timeline/import")
      .attach("file", Buffer.from("not json"), "data.txt");
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON content", async () => {
    const res = await agent
      .post("/api/timeline/import")
      .attach("file", Buffer.from("{not valid json"), "data.json");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not valid JSON/);
  });

  it("requires auth", async () => {
    const res = await request(app)
      .post("/api/timeline/import")
      .attach("file", asFile({ items: [validItem()] }), "data.json");
    expect(res.status).toBe(401);
  });
});
