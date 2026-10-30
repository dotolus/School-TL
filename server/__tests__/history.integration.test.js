const request = require("supertest");
const { createTestApp, cleanupTestApp, datasetPath } = require("./testApp");

let app, tmpDir, agent;

beforeEach(async () => {
  ({ app, tmpDir } = await createTestApp());
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({ password: "test-password" });
});

afterEach(() => {
  cleanupTestApp(tmpDir);
});

const validItem = (overrides = {}) => ({
  type: "notice",
  m: 1,
  y: 2027,
  title: "v1",
  short: "1.1",
  full: "1.1.2027",
  ...overrides,
});

describe("history & recovery", () => {
  it("logs create/update/delete and lists them newest-first", async () => {
    const create = await agent.post(datasetPath("/timeline/items")).send(validItem({ title: "v1" }));
    const id = create.body.id;
    await agent.put(datasetPath(`/timeline/items/${id}`)).send(validItem({ title: "v2" }));
    await agent.delete(datasetPath(`/timeline/items/${id}`));

    const res = await agent.get(datasetPath(`/history?itemId=${id}`));
    expect(res.status).toBe(200);
    expect(res.body.events.map((e) => e.op)).toEqual(["delete", "update", "create"]);
  });

  it("restoring a delete entry undeletes the item with its last-known properties", async () => {
    const create = await agent.post(datasetPath("/timeline/items")).send(validItem({ title: "v1" }));
    const id = create.body.id;
    await agent.delete(datasetPath(`/timeline/items/${id}`));

    const history = await agent.get(datasetPath(`/history?itemId=${id}`));
    const deleteEntry = history.body.events.find((e) => e.op === "delete");

    const restore = await agent.post(datasetPath(`/history/${deleteEntry.id}/restore`));
    expect(restore.status).toBe(200);
    expect(restore.body.title).toBe("v1");

    const list = await request(app).get(datasetPath("/timeline"));
    expect(list.body.items.map((i) => i.id)).toContain(id);
  });

  it("restoring an update entry reverts the item's properties", async () => {
    const create = await agent.post(datasetPath("/timeline/items")).send(validItem({ title: "v1" }));
    const id = create.body.id;
    await agent.put(datasetPath(`/timeline/items/${id}`)).send(validItem({ title: "v2" }));
    await agent.put(datasetPath(`/timeline/items/${id}`)).send(validItem({ title: "v3" }));

    const history = await agent.get(datasetPath(`/history?itemId=${id}`));
    const updates = history.body.events.filter((e) => e.op === "update");
    const oldestUpdate = updates[updates.length - 1]; // v1 -> v2

    const restore = await agent.post(datasetPath(`/history/${oldestUpdate.id}/restore`));
    expect(restore.status).toBe(200);
    expect(restore.body.title).toBe("v2");

    const historyAfter = await agent.get(datasetPath(`/history?itemId=${id}`));
    expect(historyAfter.body.events[0].op).toBe("restore");
  });

  it("requires auth", async () => {
    const res = await request(app).get(datasetPath("/history"));
    expect(res.status).toBe(401);
  });
});
