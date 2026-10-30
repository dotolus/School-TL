const request = require("supertest");
const { createTestApp, cleanupTestApp, datasetPath } = require("./testApp");
const { waitFor } = require("./firestoreTestEnv");

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

describe("backups", () => {
  it("requires auth to list or create backups", async () => {
    expect((await request(app).get(datasetPath("/backup"))).status).toBe(401);
    expect((await request(app).post(datasetPath("/backup"))).status).toBe(401);
  });

  it("creates a backup, lists it, then restores it (replacing current data)", async () => {
    const createA = await agent.post(datasetPath("/timeline/items")).send(validItem({ title: "A" }));
    const idA = createA.body.id;

    const backupRes = await agent.post(datasetPath("/backup"));
    expect(backupRes.status).toBe(201);
    expect(backupRes.body.itemCount).toBe(1);

    // Mutate the dataset after the backup was taken.
    await agent.post(datasetPath("/timeline/items")).send(validItem({ title: "B" }));
    await agent.delete(datasetPath(`/timeline/items/${idA}`));

    // A fresh GET .../backup right after the write above can occasionally
    // still miss it under the full suite's heavy parallel emulator load
    // (see firestoreTestEnv.js's waitFor) - a point read by id doesn't have
    // this issue, only the list query does.
    const list = await waitFor(async () => {
      const res = await agent.get(datasetPath("/backup"));
      return res.body.backups?.length >= 1 ? res : null;
    });
    expect(list.status).toBe(200);
    expect(list.body.backups).toHaveLength(1);
    expect(list.body.backups[0].id).toBe(backupRes.body.id);

    const restore = await agent.post(datasetPath(`/backup/${backupRes.body.id}/restore`));
    expect(restore.status).toBe(200);
    expect(restore.body.restored.map((i) => i.title)).toEqual(["A"]);
    expect(restore.body.skipped).toEqual([]);

    const timeline = await request(app).get(datasetPath("/timeline"));
    expect(timeline.body.items.map((i) => i.title)).toEqual(["A"]);
  });

  it("best-effort restore flags items it couldn't fully recover instead of failing", async () => {
    const backupRes = await agent.post(datasetPath("/backup"));
    expect(backupRes.body.itemCount).toBe(0);

    // Simulate a backup containing data from an incompatible/older shape by
    // restoring directly against a hand-built snapshot id - not reachable
    // through the normal admin UI, but exactly what a stale/corrupted
    // backup document would look like.
    const { getRepository } = require("../services/persistence");
    const tag = { school: process.env.ACTIVE_SCHOOL, class: "e4", period: "2026-2027" };
    await getRepository().createBackup(
      {
        id: "corrupted",
        createdAt: new Date().toISOString(),
        itemCount: 1,
        items: [{ id: "broken", type: "unknown-type", m: 0, title: "", short: "ok", full: "ok" }],
        themes: {},
      },
      tag
    );

    const restore = await agent.post(datasetPath("/backup/corrupted/restore"));
    expect(restore.status).toBe(200);
    expect(restore.body.restored).toHaveLength(1);
    expect(restore.body.restored[0].recoveryIssues).toContain("type");
    expect(restore.body.restored[0].recoveryIssues).toContain("m");

    const timeline = await agent.get(datasetPath("/timeline"));
    expect(timeline.body.items[0].recoveryIssues).toEqual(restore.body.restored[0].recoveryIssues);
  });

  it("404s restoring an unknown backup id", async () => {
    const res = await agent.post(datasetPath("/backup/does-not-exist/restore"));
    expect(res.status).toBe(404);
  });

  describe("GET /api/backup/run (the Vercel Cron entry point)", () => {
    it("rejects a request without the cron secret", async () => {
      const res = await request(app).get("/api/backup/run");
      expect(res.status).toBe(401);
    });

    it("runs the scheduled backup when authenticated as the cron", async () => {
      await agent.post(datasetPath("/timeline/items")).send(validItem());

      const res = await request(app).get("/api/backup/run").set("Authorization", "Bearer test-cron-secret");
      expect(res.status).toBe(200);
      expect(res.body.created).toBe(true);
      expect(res.body.backup.itemCount).toBe(1);

      // Confirm that backup is query-visible before checking the "skip"
      // behavior below - otherwise the same emulator lag this file's other
      // tests guard against could make the next call also see no backups
      // yet and create a second one, for the wrong reason.
      await waitFor(async () => {
        const list = await agent.get(datasetPath("/backup"));
        return list.body.backups?.length >= 1 ? list : null;
      });

      // A second tick right after is not due yet (14-day minimum interval).
      const again = await request(app).get("/api/backup/run").set("Authorization", "Bearer test-cron-secret");
      expect(again.body.created).toBe(false);
    });
  });
});
