const path = require("path");
const crypto = require("crypto");
const { applyEmulatorEnv } = require("../../__tests__/firestoreTestEnv");

const SERVER_DIR = path.join(__dirname, "..", "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

let store;
let historyStore;
let tag;

beforeEach(() => {
  applyEmulatorEnv();
  tag = { school: `test-${crypto.randomUUID()}`, class: "e4", period: "2026-2027" };
  clearServerModuleCache();
  store = require("../timelineStore");
  historyStore = require("../historyStore");
});

afterEach(() => {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_PROJECT_ID;
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
    expect(await historyStore.list(tag)).toEqual([]);
  });

  it("lists entries for an item newest-first, embedded in that item's own document", async () => {
    const item = await store.addItem(tag, validItem());
    await store.updateItem(tag, item.id, validItem({ title: "A2" }));

    const events = await historyStore.list(tag, { itemId: item.id });
    expect(events).toHaveLength(2);
    expect(events[0].op).toBe("update");
    expect(events[1].op).toBe("create");
  });

  it("filters by itemId", async () => {
    await store.addItem(tag, validItem({ title: "A" }));
    const b = await store.addItem(tag, validItem({ title: "B" }));

    const events = await historyStore.list(tag, { itemId: b.id });
    expect(events).toHaveLength(1);
    expect(events[0].itemId).toBe(b.id);
  });

  it("respects limit", async () => {
    const item = await store.addItem(tag, validItem());
    for (let i = 0; i < 4; i++) {
      await store.updateItem(tag, item.id, validItem({ title: `A${i}` }));
    }
    expect(await historyStore.list(tag, { limit: 2 })).toHaveLength(2);
  });

  it("get() finds a single entry by its id", async () => {
    const item = await store.addItem(tag, validItem());
    const [entry] = await historyStore.list(tag, { itemId: item.id });
    expect(await historyStore.get(tag, entry.id)).toMatchObject({ id: entry.id, op: "create" });
    expect(await historyStore.get(tag, "does-not-exist")).toBeNull();
  });

  it("the global feed (no itemId) includes deleted items' history too", async () => {
    const item = await store.addItem(tag, validItem());
    await store.deleteItem(tag, item.id);

    const events = await historyStore.list(tag);
    expect(events.map((e) => e.op)).toEqual(["delete", "create"]);
  });

  it("scopes to the active school/class/period - another dataset's history doesn't leak in", async () => {
    await store.addItem(tag, validItem({ title: "dataset A" }));
    const otherTag = { ...tag, school: "otherschool" };
    expect(await historyStore.list(otherTag)).toEqual([]);
  });
});
