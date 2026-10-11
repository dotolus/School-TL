const fs = require("fs");
const os = require("os");
const path = require("path");

const SERVER_DIR = path.join(__dirname, "..", "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

let tmpDir;
let store;

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

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-timeline-"));
  process.env.DATA_DIR = tmpDir;
  clearServerModuleCache();
  store = require("../timelineStore");
});

afterEach(() => {
  delete process.env.DATA_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

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
  it("addItem/updateItem/deleteItem round-trip and persist to disk", () => {
    const created = store.addItem(validItem({ title: "v1" }));
    expect(created.id).toBeTruthy();
    expect(store.getAll()).toHaveLength(1);

    const updated = store.updateItem(created.id, validItem({ title: "v2" }));
    expect(updated.title).toBe("v2");

    expect(store.deleteItem(created.id)).toBe(true);
    expect(store.getAll()).toHaveLength(0);
    expect(store.deleteItem(created.id)).toBe(false);
  });

  it("restoreFromHistory undeletes using the delete entry's before-snapshot", () => {
    const created = store.addItem(validItem({ title: "to delete" }));
    store.deleteItem(created.id);
    expect(store.getItem(created.id)).toBeNull();

    const historyStore = require("../historyStore");
    const deleteEntry = historyStore.list({ itemId: created.id }).find((e) => e.op === "delete");

    const restored = store.restoreFromHistory(deleteEntry.id);
    expect(restored.title).toBe("to delete");
    expect(store.getItem(created.id)).not.toBeNull();
  });

  it("restoreFromHistory reverts properties using an update entry's after-snapshot", () => {
    const created = store.addItem(validItem({ title: "v1" }));
    store.updateItem(created.id, validItem({ title: "v2" }));
    store.updateItem(created.id, validItem({ title: "v3" }));

    const historyStore = require("../historyStore");
    const firstUpdate = historyStore
      .list({ itemId: created.id })
      .filter((e) => e.op === "update")
      .at(-1); // oldest update = v1 -> v2

    const restored = store.restoreFromHistory(firstUpdate.id);
    expect(restored.title).toBe("v2");
    expect(store.getItem(created.id).title).toBe("v2");
  });

  it("restoreFromHistory returns null for an unknown event id", () => {
    expect(store.restoreFromHistory("does-not-exist")).toBeNull();
  });
});
