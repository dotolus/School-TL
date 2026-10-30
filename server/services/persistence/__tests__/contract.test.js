// Exercises the full persistence contract (contract.js) directly against
// firestoreAdapter.js. This is what a future second adapter would be
// checked against to confirm it's a drop-in replacement - timelineStore.js
// and historyStore.js only ever call these same methods.
const path = require("path");
const crypto = require("crypto");
const { applyEmulatorEnv, waitFor } = require("../../../__tests__/firestoreTestEnv");

const SERVER_DIR = path.join(__dirname, "..", "..", "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

let adapter;
let tag;

beforeEach(() => {
  applyEmulatorEnv();
  clearServerModuleCache();
  adapter = require("../firestoreAdapter");
  tag = { school: `test-${crypto.randomUUID()}`, class: "e4", period: "2026-2027" };
});

afterEach(() => {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_PROJECT_ID;
});

function makeRecord(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ...tag,
    status: "active",
    type: "notice",
    m: 1,
    y: 2027,
    title: "A",
    short: "1.1",
    full: "1.1.2027",
    detail: {},
    "required-white-shirt": false,
    "required-food": false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeEntry(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    op: "create",
    itemId: null,
    title: "A",
    before: null,
    after: null,
    ...overrides,
  };
}

describe("firestoreAdapter (persistence contract)", () => {
  it("createEvent + getEvent + getActiveEvents round-trip", async () => {
    const record = makeRecord();
    await adapter.createEvent(record, makeEntry({ itemId: record.id, after: record }), tag);

    expect(await adapter.getEvent(record.id, tag)).toMatchObject({ id: record.id, title: "A" });
    expect(await adapter.getActiveEvents(tag)).toHaveLength(1);
  });

  it("getEvent/getActiveEvents don't leak across datasets", async () => {
    const record = makeRecord();
    await adapter.createEvent(record, makeEntry({ itemId: record.id }), tag);

    const otherTag = { ...tag, school: `other-${crypto.randomUUID()}` };
    expect(await adapter.getEvent(record.id, otherTag)).toBeNull();
    expect(await adapter.getActiveEvents(otherTag)).toEqual([]);
  });

  it("updateActiveEvent reads the existing doc, applies fields + a history entry atomically, and returns null for a missing doc", async () => {
    const record = makeRecord();
    await adapter.createEvent(record, makeEntry({ itemId: record.id }), tag);

    const entryId = crypto.randomUUID();
    const result = await adapter.updateActiveEvent(record.id, tag, (existing) => {
      expect(existing.title).toBe("A");
      return {
        fields: { title: "B", updatedAt: new Date().toISOString() },
        historyEntry: makeEntry({ id: entryId, op: "update", itemId: record.id, title: "B" }),
      };
    });
    expect(result).toBeTruthy();

    expect((await adapter.getEvent(record.id, tag)).title).toBe("B");
    expect(await adapter.getHistoryEntry(entryId, tag)).toMatchObject({ op: "update", itemId: record.id });

    const missing = await adapter.updateActiveEvent("does-not-exist", tag, () => ({
      fields: {},
      historyEntry: makeEntry(),
    }));
    expect(missing).toBeNull();
  });

  it("restoreEvent reads the history entry and its owning event, then writes atomically", async () => {
    const record = makeRecord({ status: "deleted" });
    const deleteEntryId = crypto.randomUUID();
    await adapter.createEvent(
      record,
      makeEntry({ id: deleteEntryId, op: "delete", itemId: record.id, before: record, after: null }),
      tag
    );

    const result = await adapter.restoreEvent(deleteEntryId, tag, (entry, eventRecord) => {
      expect(entry.op).toBe("delete");
      expect(eventRecord.id).toBe(record.id);
      return {
        fields: { status: "active", updatedAt: new Date().toISOString() },
        historyEntry: makeEntry({ op: "restore", itemId: record.id }),
      };
    });
    expect(result).toBeTruthy();
    expect((await adapter.getEvent(record.id, tag)).status).toBe("active");
  });

  it("restoreEvent returns null for an unknown history entry id", async () => {
    const result = await adapter.restoreEvent("does-not-exist", tag, () => ({
      fields: {},
      historyEntry: makeEntry(),
    }));
    expect(result).toBeNull();
  });

  it("restoreEvent passes a null eventRecord when the entry's itemId has no owning event", async () => {
    const entryId = crypto.randomUUID();
    await adapter.createEvent(makeRecord(), makeEntry({ id: entryId, itemId: "ghost-id" }), tag);

    let sawEventRecord = "not-called";
    const result = await adapter.restoreEvent(entryId, tag, (entry, eventRecord) => {
      sawEventRecord = eventRecord;
      return null;
    });
    expect(sawEventRecord).toBeNull();
    expect(result).toBeNull();
  });

  it("listHistory returns entries newest-first, filtered by itemId, and respects limit", async () => {
    const record = makeRecord();
    await adapter.createEvent(
      record,
      makeEntry({ itemId: record.id, op: "create", ts: "2027-01-01T00:00:00.000Z" }),
      tag
    );
    await adapter.updateActiveEvent(record.id, tag, () => ({
      fields: { title: "A2" },
      historyEntry: makeEntry({ itemId: record.id, op: "update", ts: "2027-01-02T00:00:00.000Z" }),
    }));

    const all = await adapter.listHistory(tag, { itemId: record.id });
    expect(all.map((e) => e.op)).toEqual(["update", "create"]);

    const limited = await adapter.listHistory(tag, { itemId: record.id, limit: 1 });
    expect(limited).toHaveLength(1);
    expect(limited[0].op).toBe("update");
  });

  it("getHistoryEntry doesn't leak across datasets", async () => {
    const record = makeRecord();
    const entryId = crypto.randomUUID();
    await adapter.createEvent(record, makeEntry({ id: entryId, itemId: record.id }), tag);

    const otherTag = { ...tag, school: `other-${crypto.randomUUID()}` };
    expect(await adapter.getHistoryEntry(entryId, otherTag)).toBeNull();
  });

  describe("backups", () => {
    function makeBackup(overrides = {}) {
      return {
        id: "2027-01-01",
        createdAt: "2027-01-01T06:00:00.000Z",
        itemCount: 1,
        items: [{ id: "x", title: "A" }],
        themes: { activeThemeId: "paper" },
        ...overrides,
      };
    }

    it("createBackup + getBackup round-trip", async () => {
      await adapter.createBackup(makeBackup(), tag);

      const got = await adapter.getBackup("2027-01-01", tag);
      expect(got).toMatchObject({ id: "2027-01-01", itemCount: 1 });
      expect(got.items).toEqual([{ id: "x", title: "A" }]);
    });

    it("createBackup upserts by id - a second write for the same date overwrites the first", async () => {
      await adapter.createBackup(makeBackup({ itemCount: 1 }), tag);
      await adapter.createBackup(makeBackup({ itemCount: 2 }), tag);

      expect((await adapter.getBackup("2027-01-01", tag)).itemCount).toBe(2);
    });

    it("listBackups returns metadata only, newest first", async () => {
      await adapter.createBackup(makeBackup({ id: "2027-01-01", createdAt: "2027-01-01T00:00:00.000Z" }), tag);
      await adapter.createBackup(makeBackup({ id: "2027-01-02", createdAt: "2027-01-02T00:00:00.000Z" }), tag);

      // listBackups is a .where() query, which (unlike getBackup's point
      // read by id) can briefly lag behind these writes under the full
      // suite's heavy parallel emulator load - see firestoreTestEnv.js's
      // waitFor.
      const list = await waitFor(async () => {
        const result = await adapter.listBackups(tag);
        return result.length >= 2 ? result : null;
      });
      expect(list.map((b) => b.id)).toEqual(["2027-01-02", "2027-01-01"]);
      expect(list[0].items).toBeUndefined();
    });

    it("getBackup/listBackups don't leak across datasets", async () => {
      await adapter.createBackup(makeBackup(), tag);
      const otherTag = { ...tag, school: `other-${crypto.randomUUID()}` };
      expect(await adapter.getBackup("2027-01-01", otherTag)).toBeNull();
      expect(await adapter.listBackups(otherTag)).toEqual([]);
    });

    it("two datasets backing up on the same date don't overwrite each other", async () => {
      const otherTag = { ...tag, school: `other-${crypto.randomUUID()}` };
      await adapter.createBackup(makeBackup({ itemCount: 1 }), tag);
      await adapter.createBackup(makeBackup({ itemCount: 2 }), otherTag);

      expect((await adapter.getBackup("2027-01-01", tag)).itemCount).toBe(1);
      expect((await adapter.getBackup("2027-01-01", otherTag)).itemCount).toBe(2);
    });
  });
});
