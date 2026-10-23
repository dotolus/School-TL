// Full-dataset backup/restore, on top of the same persistence layer as
// events/history (see server/services/persistence/) - never touches
// Firestore directly. One backup is a single document holding every active
// item plus the active theme id at the moment it was taken, keyed by the
// date it was taken (see contract.js's BackupRecord).
const { getRepository } = require("./persistence");
const timelineStore = require("./timelineStore");
const themeStore = require("./themeStore");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD, BACKUP_MIN_INTERVAL_DAYS } = require("../config");

function activeDatasetFilter() {
  return { school: ACTIVE_SCHOOL, class: ACTIVE_CLASS, period: ACTIVE_PERIOD };
}

function dateId(date) {
  return date.toISOString().slice(0, 10);
}

async function createBackup() {
  const tag = activeDatasetFilter();
  const items = await timelineStore.getAll();
  const { activeThemeId } = themeStore.getAll();
  const now = new Date();
  const record = {
    id: dateId(now),
    createdAt: now.toISOString(),
    itemCount: items.length,
    items,
    themes: { activeThemeId },
  };
  await getRepository().createBackup(record, tag);
  console.log(`[backupStore] Created backup ${record.id} (${items.length} item(s))`);
  return { id: record.id, createdAt: record.createdAt, itemCount: record.itemCount };
}

async function listBackups() {
  return getRepository().listBackups(activeDatasetFilter());
}

async function getBackup(id) {
  return getRepository().getBackup(id, activeDatasetFilter());
}

async function restoreBackup(id) {
  const backup = await getBackup(id);
  if (!backup) return null;

  const { restored, skipped } = await timelineStore.restoreAllFromBackup(backup.items || []);

  let themeRestored = false;
  const activeThemeId = backup.themes?.activeThemeId;
  if (activeThemeId) {
    try {
      themeStore.setActive(activeThemeId);
      themeRestored = true;
    } catch (err) {
      // Best-effort here too - the theme that was active at backup time may
      // no longer exist; that's cosmetic, not worth failing the restore.
      console.warn(`[backupStore] Could not restore theme "${activeThemeId}":`, err.message);
    }
  }

  console.log(`[backupStore] Restored backup ${id}: ${restored.length} item(s), ${skipped.length} skipped`);
  return { id, restored, skipped, themeRestored };
}

// Called on a tighter cron tick than the real cadence (see server/jobs/backupJob.js
// and GET /api/backup/run) - cron syntax has no native "every N weeks", so
// the actual once-every-BACKUP_MIN_INTERVAL_DAYS cadence is enforced here by
// comparing against the last backup's own timestamp instead, which also
// means a missed tick (e.g. the server was down) just backs up on the next
// one rather than skipping a cycle.
async function runScheduledBackupIfDue() {
  const backups = await listBackups();
  const last = backups[0];
  if (last) {
    const daysSince = (Date.now() - new Date(last.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince < BACKUP_MIN_INTERVAL_DAYS) {
      console.log(
        `[backupStore] Scheduled backup skipped - last backup was ${daysSince.toFixed(1)} day(s) ago (need ${BACKUP_MIN_INTERVAL_DAYS})`
      );
      return null;
    }
  }
  return createBackup();
}

module.exports = { createBackup, listBackups, getBackup, restoreBackup, runScheduledBackupIfDue };
