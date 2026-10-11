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
let historyStore;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-history-"));
  process.env.DATA_DIR = tmpDir;
  clearServerModuleCache();
  historyStore = require("../historyStore");
});

afterEach(() => {
  delete process.env.DATA_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("historyStore", () => {
  it("returns an empty list before anything was appended", () => {
    expect(historyStore.list()).toEqual([]);
  });

  it("appends entries and lists them newest-first", () => {
    historyStore.append({ op: "create", itemId: "a", title: "A", before: null, after: {} });
    historyStore.append({ op: "update", itemId: "a", title: "A2", before: {}, after: {} });

    const events = historyStore.list();
    expect(events).toHaveLength(2);
    expect(events[0].op).toBe("update");
    expect(events[1].op).toBe("create");
  });

  it("filters by itemId", () => {
    historyStore.append({ op: "create", itemId: "a", title: "A", before: null, after: {} });
    historyStore.append({ op: "create", itemId: "b", title: "B", before: null, after: {} });

    const events = historyStore.list({ itemId: "b" });
    expect(events).toHaveLength(1);
    expect(events[0].itemId).toBe("b");
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) {
      historyStore.append({ op: "create", itemId: "a", title: `A${i}`, before: null, after: {} });
    }
    expect(historyStore.list({ limit: 2 })).toHaveLength(2);
  });

  it("get() finds a single entry by its id", () => {
    const entry = historyStore.append({ op: "create", itemId: "a", title: "A", before: null, after: {} });
    expect(historyStore.get(entry.id)).toMatchObject({ id: entry.id, op: "create" });
    expect(historyStore.get("does-not-exist")).toBeNull();
  });
});
