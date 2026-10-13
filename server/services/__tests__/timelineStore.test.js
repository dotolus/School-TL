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
});

function validItem(overrides = {}) {
  return {
    type: "notice",
    m: 1,
    y: 2027,
    title: "Test item",
    short: "1.1",
    full: "1.1.2027",
    ...overrides,
  };
}

describe("validateItemInput", () => {
  it("accepts a well-formed item", () => {
    expect(() => store.validateItemInput(validItem())).not.toThrow();
  });

  it("rejects an invalid type", () => {
    expect(() => store.validateItemInput(validItem({ type: "bogus" }))).toThrow(/type must be one of/);
  });

  it("rejects an out-of-range month", () => {
    expect(() => store.validateItemInput(validItem({ m: 13 }))).toThrow(/month 1-12/);
  });

  it("rejects a non-boolean required-white-shirt", () => {
    expect(() =>
      store.validateItemInput(validItem({ "required-white-shirt": "yes" }))
    ).toThrow(/required-white-shirt must be a boolean/);
  });

  it("rejects a non-boolean required-food", () => {
    expect(() => store.validateItemInput(validItem({ "required-food": 1 }))).toThrow(
      /required-food must be a boolean/
    );
  });

  it("rejects detail.images that isn't an array", () => {
    expect(() =>
      store.validateItemInput(validItem({ detail: { images: "nope" } }))
    ).toThrow(/detail.images must be an array/);
  });
});

describe("timelineStore CRUD + history integration", () => {
  it("addItem/updateItem/deleteItem round-trip", async () => {
    const created = await store.addItem(validItem({ title: "v1" }));
    expect(created.id).toBeTruthy();
    expect(await store.getAll()).toHaveLength(1);

    const updated = await store.updateItem(created.id, validItem({ title: "v2" }));
    expect(updated.title).toBe("v2");

    expect(await store.deleteItem(created.id)).toBe(true);
    expect(await store.getAll()).toHaveLength(0);
    expect(await store.deleteItem(created.id)).toBe(false);
  });

  it("a soft-deleted item disappears from getAll/getItem but its document survives for history", async () => {
    const created = await store.addItem(validItem({ title: "to delete" }));
    await store.deleteItem(created.id);

    expect(await store.getItem(created.id)).toBeNull();
    expect(await store.getAll()).toEqual([]);

    const deleteEntry = (await historyStore.list({ itemId: created.id })).find((e) => e.op === "delete");
    expect(deleteEntry).toBeTruthy();
    expect(deleteEntry.before.title).toBe("to delete");
  });

  it("restoreFromHistory undeletes using the delete entry's before-snapshot", async () => {
    const created = await store.addItem(validItem({ title: "to delete" }));
    await store.deleteItem(created.id);
    expect(await store.getItem(created.id)).toBeNull();

    const deleteEntry = (await historyStore.list({ itemId: created.id })).find((e) => e.op === "delete");
    const restored = await store.restoreFromHistory(deleteEntry.id);
    expect(restored.title).toBe("to delete");
    expect(await store.getItem(created.id)).not.toBeNull();
  });

  it("restoreFromHistory reverts properties using an update entry's after-snapshot", async () => {
    const created = await store.addItem(validItem({ title: "v1" }));
    await store.updateItem(created.id, validItem({ title: "v2" }));
    await store.updateItem(created.id, validItem({ title: "v3" }));

    const updates = (await historyStore.list({ itemId: created.id })).filter((e) => e.op === "update");
    const firstUpdate = updates.at(-1); // oldest update = v1 -> v2

    const restored = await store.restoreFromHistory(firstUpdate.id);
    expect(restored.title).toBe("v2");
    expect((await store.getItem(created.id)).title).toBe("v2");
  });

  it("restoreFromHistory returns null for an unknown event id", async () => {
    expect(await store.restoreFromHistory("does-not-exist")).toBeNull();
  });
});

describe("dataset scoping", () => {
  it("only surfaces items tagged with the active school/class/period", async () => {
    await store.addItem(validItem({ title: "in dataset A" }));

    process.env.ACTIVE_SCHOOL = "otherschool";
    clearServerModuleCache();
    const otherStore = require("../timelineStore");
    expect(await otherStore.getAll()).toEqual([]);

    delete process.env.ACTIVE_SCHOOL;
  });
});

describe("importItems", () => {
  it("creates items that have no matching id and updates ones that do", async () => {
    const existing = await store.addItem(validItem({ title: "original" }));

    const result = await store.importItems([
      { ...validItem({ title: "replaced" }), id: existing.id },
      validItem({ title: "brand new" }),
    ]);

    expect(result).toEqual({ created: 1, updated: 1 });
    expect(await store.getAll()).toHaveLength(2);
    expect((await store.getItem(existing.id)).title).toBe("replaced");
  });

  it("logs a history entry per imported item", async () => {
    const existing = await store.addItem(validItem({ title: "original" }));
    await store.importItems([
      { ...validItem({ title: "replaced" }), id: existing.id },
      validItem({ title: "brand new" }),
    ]);

    const allEvents = await historyStore.list();
    expect(allEvents.filter((e) => e.op === "update")).toHaveLength(1);
    expect(allEvents.filter((e) => e.op === "create")).toHaveLength(2); // original add + import add
  });

  it("is all-or-nothing on validation: a single invalid item aborts before any write", async () => {
    await expect(store.importItems([validItem(), validItem({ type: "bogus" })])).rejects.toThrow(
      /Import validation failed/
    );
    expect(await store.getAll()).toHaveLength(0);
  });

  it("rejects a non-array payload", async () => {
    await expect(store.importItems({ not: "an array" })).rejects.toThrow(/items must be an array/);
  });
});
