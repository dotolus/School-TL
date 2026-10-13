const path = require("path");
const crypto = require("crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER_DIR = path.join(__dirname, "..", "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

let mongod;
let store;
let historyStore;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
});

afterAll(async () => {
  await mongod.stop();
});

beforeEach(() => {
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = `eq_ppt_test_${crypto.randomUUID()}`;
  clearServerModuleCache();
  store = require("../timelineStore");
  historyStore = require("../historyStore");
});

afterEach(() => {
  delete process.env.MONGODB_URI;
  delete process.env.MONGODB_DB_NAME;
  delete process.env.ACTIVE_SCHOOL;
});

const validItem = (overrides = {}) => ({
  type: "notice",
  m: 1,
  y: 2027,
  title: "A",
  short: "1.1",
  full: "1.1.2027",
  ...overrides,
});

describe("historyStore", () => {
  it("returns an empty list before anything was created", async () => {
    expect(await historyStore.list()).toEqual([]);
  });

  it("lists entries for an item newest-first, embedded in that item's own document", async () => {
    const item = await store.addItem(validItem());
    await store.updateItem(item.id, validItem({ title: "A2" }));

    const events = await historyStore.list({ itemId: item.id });
    expect(events).toHaveLength(2);
    expect(events[0].op).toBe("update");
    expect(events[1].op).toBe("create");
  });

  it("filters by itemId", async () => {
    await store.addItem(validItem({ title: "A" }));
    const b = await store.addItem(validItem({ title: "B" }));

    const events = await historyStore.list({ itemId: b.id });
    expect(events).toHaveLength(1);
    expect(events[0].itemId).toBe(b.id);
  });

  it("respects limit", async () => {
    const item = await store.addItem(validItem());
    for (let i = 0; i < 4; i++) {
      await store.updateItem(item.id, validItem({ title: `A${i}` }));
    }
    expect(await historyStore.list({ limit: 2 })).toHaveLength(2);
  });

  it("get() finds a single entry by its id", async () => {
    const item = await store.addItem(validItem());
    const [entry] = await historyStore.list({ itemId: item.id });
    expect(await historyStore.get(entry.id)).toMatchObject({ id: entry.id, op: "create" });
    expect(await historyStore.get("does-not-exist")).toBeNull();
  });

  it("the global feed (no itemId) includes deleted items' history too", async () => {
    const item = await store.addItem(validItem());
    await store.deleteItem(item.id);

    const events = await historyStore.list();
    expect(events.map((e) => e.op)).toEqual(["delete", "create"]);
  });

  it("scopes to the active school/class/period - another dataset's history doesn't leak in", async () => {
    await store.addItem(validItem({ title: "dataset A" }));

    process.env.ACTIVE_SCHOOL = "otherschool";
    clearServerModuleCache();
    const otherHistoryStore = require("../historyStore");
    expect(await otherHistoryStore.list()).toEqual([]);
  });
});
