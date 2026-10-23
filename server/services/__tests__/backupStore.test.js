const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { applyEmulatorEnv, waitFor } = require("../../__tests__/firestoreTestEnv");

const SERVER_DIR = path.join(__dirname, "..", "..");

function clearServerModuleCache() {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(SERVER_DIR)) delete require.cache[filename];
  }
}

function seedThemes(tmpDir, activeThemeId) {
  fs.writeFileSync(
    path.join(tmpDir, "themes.json"),
    JSON.stringify({
      activeThemeId,
      themes: [
        { id: "paper", name: "Paper", vars: {} },
        { id: "dark", name: "Dark", vars: {} },
      ],
    })
  );
}

let tmpDir;
let tag;
let store;
let backupStore;
let themeStore;

beforeEach(() => {
  applyEmulatorEnv();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-backup-"));
  process.env.DATA_DIR = tmpDir;
  process.env.ACTIVE_SCHOOL = `test-${crypto.randomUUID()}`;
  seedThemes(tmpDir, "paper");
  clearServerModuleCache();
  store = require("../timelineStore");
  backupStore = require("../backupStore");
  themeStore = require("../themeStore");
  tag = { school: process.env.ACTIVE_SCHOOL, class: "e4", period: "2026-2027" };
});

afterEach(() => {
  delete process.env.ACTIVE_SCHOOL;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.DATA_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
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

describe("backupStore.createBackup/getBackup/listBackups", () => {
  it("snapshots all active items and the active theme", async () => {
    await store.addItem(validItem({ title: "A" }));
    await store.addItem(validItem({ title: "B" }));
    themeStore.setActive("dark");

    const backup = await backupStore.createBackup();
    expect(backup.itemCount).toBe(2);
    expect(backup.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const full = await backupStore.getBackup(backup.id);
    expect(full.items.map((i) => i.title).sort()).toEqual(["A", "B"]);
    expect(full.themes.activeThemeId).toBe("dark");
  });

  it("listBackups returns metadata only, newest first", async () => {
    await store.addItem(validItem());
    const today = await backupStore.createBackup();

    const { getRepository } = require("../persistence");
    await getRepository().createBackup(
      { id: "2020-01-01", createdAt: "2020-01-01T00:00:00.000Z", itemCount: 0, items: [], themes: {} },
      tag
    );

    const list = await waitFor(async () => {
      const result = await backupStore.listBackups();
      return result.length >= 2 ? result : null;
    });
    expect(list.map((b) => b.id)).toEqual([today.id, "2020-01-01"]);
    expect(list[0].items).toBeUndefined();
  });
});

describe("backupStore.runScheduledBackupIfDue", () => {
  it("backs up immediately when no backup exists yet", async () => {
    const result = await backupStore.runScheduledBackupIfDue();
    expect(result).not.toBeNull();
    const list = await waitFor(async () => {
      const r = await backupStore.listBackups();
      return r.length >= 1 ? r : null;
    });
    expect(list).toHaveLength(1);
  });

  it("skips when the last backup is within the minimum interval", async () => {
    await backupStore.createBackup();
    // Confirm the backup is query-visible first - runScheduledBackupIfDue
    // itself does a listBackups() to find "last", so without this the same
    // emulator lag this file's other tests guard against could make it see
    // no backups yet and create a second one, which would also make this
    // assertion fail (for the opposite reason than a real bug would).
    await waitFor(async () => {
      const r = await backupStore.listBackups();
      return r.length >= 1 ? r : null;
    });

    const result = await backupStore.runScheduledBackupIfDue();
    expect(result).toBeNull();
    expect(await backupStore.listBackups()).toHaveLength(1);
  });

  it("backs up again once the minimum interval has passed", async () => {
    const { getRepository } = require("../persistence");
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await getRepository().createBackup(
      { id: "old", createdAt: oldDate.toISOString(), itemCount: 0, items: [], themes: {} },
      tag
    );

    const result = await backupStore.runScheduledBackupIfDue();
    expect(result).not.toBeNull();
    const list = await waitFor(async () => {
      const r = await backupStore.listBackups();
      return r.length >= 2 ? r : null;
    });
    expect(list).toHaveLength(2);
  });
});

describe("backupStore.restoreBackup", () => {
  it("restores items and the active theme, best-effort if the theme no longer exists", async () => {
    await store.addItem(validItem({ title: "A" }));
    themeStore.setActive("dark");
    const backup = await backupStore.createBackup();

    themeStore.setActive("paper");
    await store.addItem(validItem({ title: "C" })); // created after the backup - should be pruned

    const result = await backupStore.restoreBackup(backup.id);
    expect(result.themeRestored).toBe(true);
    expect(themeStore.getAll().activeThemeId).toBe("dark");

    const items = await store.getAll();
    expect(items.map((i) => i.title)).toEqual(["A"]);
  });

  it("returns null for an unknown backup id", async () => {
    expect(await backupStore.restoreBackup("does-not-exist")).toBeNull();
  });
});
