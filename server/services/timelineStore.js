const crypto = require("crypto");
const { getRepository } = require("./persistence");
const { ACTIVE_SCHOOL, ACTIVE_CLASS, ACTIVE_PERIOD } = require("../config");

const VALID_TYPES = new Set(["holiday", "test", "notice", "project"]);

function activeDatasetFilter() {
  return { school: ACTIVE_SCHOOL, class: ACTIVE_CLASS, period: ACTIVE_PERIOD };
}

function validateItemInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Item payload must be an object");
  }
  if (!VALID_TYPES.has(input.type)) {
    throw new Error(`type must be one of ${[...VALID_TYPES].join(", ")}`);
  }
  if (!Number.isInteger(input.m) || input.m < 1 || input.m > 12) {
    throw new Error("m must be an integer month 1-12");
  }
  if (!Number.isInteger(input.y)) {
    throw new Error("y must be an integer year");
  }
  if (!input.title || typeof input.title !== "string") {
    throw new Error("title is required");
  }
  if (!input.short || typeof input.short !== "string") {
    throw new Error("short is required");
  }
  if (!input.full || typeof input.full !== "string") {
    throw new Error("full is required");
  }
  const detail = input.detail || {};
  if (detail.links && !Array.isArray(detail.links)) {
    throw new Error("detail.links must be an array");
  }
  if (detail.words && !Array.isArray(detail.words)) {
    throw new Error("detail.words must be an array");
  }
  if (detail.attachments && !Array.isArray(detail.attachments)) {
    throw new Error("detail.attachments must be an array");
  }
  if (detail.generalInfo !== undefined && typeof detail.generalInfo !== "string") {
    throw new Error("detail.generalInfo must be a string");
  }
  if (
    input["required-white-shirt"] !== undefined &&
    typeof input["required-white-shirt"] !== "boolean"
  ) {
    throw new Error("required-white-shirt must be a boolean");
  }
  if (input["required-food"] !== undefined && typeof input["required-food"] !== "boolean") {
    throw new Error("required-food must be a boolean");
  }
  if (
    input["required-parent-signature"] !== undefined &&
    typeof input["required-parent-signature"] !== "boolean"
  ) {
    throw new Error("required-parent-signature must be a boolean");
  }
}

// Strips the internal-only fields (school/class/period/status/timestamps)
// so every API response keeps the exact same item shape the file-based
// store used to return.
function toExternalItem(record) {
  if (!record) return null;
  return {
    id: record.id,
    type: record.type,
    m: record.m,
    y: record.y,
    title: record.title,
    short: record.short,
    full: record.full,
    detail: record.detail || {},
    "required-white-shirt": Boolean(record["required-white-shirt"]),
    "required-food": Boolean(record["required-food"]),
    "required-parent-signature": Boolean(record["required-parent-signature"]),
    // Non-empty only for an item that went through restoreAllFromBackup and
    // had one or more fields it couldn't recover as-is (see below) - lists
    // which field names were defaulted. A normal add/update always resets
    // this to [] (input never carries it), so re-saving an item through the
    // admin UI is how an admin marks it "fixed".
    recoveryIssues: Array.isArray(record.recoveryIssues) ? record.recoveryIssues : [],
  };
}

function fieldsFromInput(input) {
  return {
    type: input.type,
    m: input.m,
    y: input.y,
    title: input.title,
    short: input.short,
    full: input.full,
    detail: input.detail || {},
    "required-white-shirt": Boolean(input["required-white-shirt"]),
    "required-food": Boolean(input["required-food"]),
    "required-parent-signature": Boolean(input["required-parent-signature"]),
    recoveryIssues: Array.isArray(input.recoveryIssues) ? input.recoveryIssues : [],
  };
}

function makeHistoryEntry(partial) {
  return { id: crypto.randomUUID(), ts: new Date().toISOString(), ...partial };
}

async function getAll() {
  const { school, class: cls, period } = activeDatasetFilter();
  try {
    const records = await getRepository().getActiveEvents(activeDatasetFilter());
    return records.map(toExternalItem);
  } catch (err) {
    console.error(`[timelineStore] Failed to fetch items for ${school}/${cls}/${period}:`, err.message);
    throw err;
  }
}

async function getItem(id) {
  try {
    const record = await getRepository().getEvent(id, activeDatasetFilter());
    return toExternalItem(record);
  } catch (err) {
    console.error(`[timelineStore] Failed to fetch item ${id}:`, err.message);
    throw err;
  }
}

async function addItem(input) {
  try {
    validateItemInput(input);
    const tag = activeDatasetFilter();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record = {
      id,
      ...tag,
      status: "active",
      ...fieldsFromInput(input),
      createdAt: now,
      updatedAt: now,
    };
    const external = toExternalItem(record);
    const entry = makeHistoryEntry({ op: "create", itemId: id, title: record.title, before: null, after: external });
    await getRepository().createEvent(record, entry, tag);
    console.log(`[timelineStore] Created item ${id} (${record.title})`);
    return external;
  } catch (err) {
    console.error("[timelineStore] Failed to create item:", err.message);
    throw err;
  }
}

async function updateItem(id, input) {
  try {
    validateItemInput(input);
    const tag = activeDatasetFilter();
    let after = null;
    const ok = await getRepository().updateActiveEvent(id, tag, (existing) => {
      const before = toExternalItem(existing);
      after = { ...before, ...fieldsFromInput(input), id };
      const entry = makeHistoryEntry({ op: "update", itemId: id, title: after.title, before, after });
      return { fields: { ...fieldsFromInput(after), updatedAt: new Date().toISOString() }, historyEntry: entry };
    });
    if (!ok) {
      console.warn(`[timelineStore] Update failed: item ${id} not found`);
      return null;
    }
    console.log(`[timelineStore] Updated item ${id} (${after.title})`);
    return after;
  } catch (err) {
    console.error(`[timelineStore] Failed to update item ${id}:`, err.message);
    throw err;
  }
}

async function deleteItem(id) {
  try {
    const tag = activeDatasetFilter();
    let before = null;
    const ok = await getRepository().updateActiveEvent(id, tag, (existing) => {
      before = toExternalItem(existing);
      const entry = makeHistoryEntry({ op: "delete", itemId: id, title: before.title, before, after: null });
      return { fields: { status: "deleted", updatedAt: new Date().toISOString() }, historyEntry: entry };
    });
    if (!ok) {
      console.warn(`[timelineStore] Delete failed: item ${id} not found`);
      return false;
    }
    console.log(`[timelineStore] Deleted item ${id} (${before.title})`);
    return true;
  } catch (err) {
    console.error(`[timelineStore] Failed to delete item ${id}:`, err.message);
    throw err;
  }
}

async function importItems(inputItems) {
  if (!Array.isArray(inputItems)) {
    throw new Error("items must be an array");
  }
  const errors = [];
  inputItems.forEach((input, index) => {
    try {
      validateItemInput(input);
    } catch (err) {
      errors.push({ index, error: err.message });
    }
  });
  if (errors.length) {
    console.error(`[timelineStore] Import validation failed for ${errors.length} item(s)`);
    const err = new Error("Import validation failed");
    err.details = errors;
    throw err;
  }

  const result = { created: 0, updated: 0 };

  // Validation already ran up-front (pure, no DB access) so a bad item
  // never gets here; what's left is a sequence of single-document writes,
  // each atomic on its own but not as one all-or-nothing transaction across
  // documents the way the old single-file write was. Acceptable for this
  // app's scale/demo-data status - flagged here rather than silently assumed.
  for (const input of inputItems) {
    if (input.id) {
      const updated = await updateItem(input.id, input);
      if (updated) {
        result.updated += 1;
        continue;
      }
    }
    await addItem(input);
    result.created += 1;
  }

  console.log(`[timelineStore] Import complete: ${result.created} created, ${result.updated} updated`);
  return result;
}

async function restoreFromHistory(eventId) {
  try {
    const tag = activeDatasetFilter();
    let restored = null;
    const ok = await getRepository().restoreEvent(eventId, tag, (entry, eventRecord) => {
      // Structurally unreachable via any real app code path (events are
      // never hard-deleted), but the flat history collection no longer
      // guarantees a history entry's itemId still resolves the way Mongo's
      // embedded array did - guard it defensively.
      if (!eventRecord) return null;
      const snapshot = entry.op === "delete" ? entry.before : entry.after;
      if (!snapshot) return null;

      const previousState = eventRecord.status === "active" ? toExternalItem(eventRecord) : null;
      restored = { ...snapshot, id: eventRecord.id };
      const restoreEntry = makeHistoryEntry({
        op: "restore",
        itemId: restored.id,
        title: restored.title,
        before: previousState,
        after: restored,
      });
      return {
        fields: { ...fieldsFromInput(restored), status: "active", updatedAt: new Date().toISOString() },
        historyEntry: restoreEntry,
      };
    });
    if (!ok) {
      console.warn(`[timelineStore] Restore failed: history entry ${eventId} not found or has no snapshot`);
      return null;
    }
    console.log(`[timelineStore] Restored item ${restored.id} from history entry ${eventId}`);
    return restored;
  } catch (err) {
    console.error(`[timelineStore] Failed to restore from history entry ${eventId}:`, err.message);
    throw err;
  }
}

// Best-effort per-field sanitizer used by restoreAllFromBackup (never
// throws): a backup item written months ago by an earlier version of this
// app, or corrupted in transit, may be missing fields or have the wrong
// shape entirely. Unlike validateItemInput (which rejects the whole item),
// this defaults each bad field independently and records its name in
// recoveryIssues, so the item still comes back - just flagged - instead of
// the whole restore failing or silently dropping it.
function sanitizeBackupItem(raw) {
  const issues = [];
  const safe = raw && typeof raw === "object" ? raw : {};
  if (!raw || typeof raw !== "object") issues.push("item");

  const id = typeof safe.id === "string" && safe.id ? safe.id : crypto.randomUUID();

  let type = safe.type;
  if (!VALID_TYPES.has(type)) {
    type = "notice";
    issues.push("type");
  }

  let m = safe.m;
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    m = 1;
    issues.push("m");
  }

  let y = safe.y;
  if (!Number.isInteger(y)) {
    y = new Date().getFullYear();
    issues.push("y");
  }

  const strings = {};
  for (const field of ["title", "short", "full"]) {
    const value = safe[field];
    if (typeof value === "string" && value) {
      strings[field] = value;
    } else {
      strings[field] = "";
      issues.push(field);
    }
  }

  const rawDetail = safe.detail;
  if (rawDetail !== undefined && (typeof rawDetail !== "object" || rawDetail === null)) {
    issues.push("detail");
  }
  const detailSource = rawDetail && typeof rawDetail === "object" ? rawDetail : {};
  const detail = {
    words: Array.isArray(detailSource.words) ? detailSource.words : [],
    links: Array.isArray(detailSource.links) ? detailSource.links : [],
    attachments: Array.isArray(detailSource.attachments) ? detailSource.attachments : [],
  };
  if (detailSource.pages !== undefined) detail.pages = detailSource.pages;
  if (detailSource.generalInfo !== undefined) detail.generalInfo = detailSource.generalInfo;

  return {
    id,
    type,
    m,
    y,
    ...strings,
    detail,
    "required-white-shirt": Boolean(safe["required-white-shirt"]),
    "required-food": Boolean(safe["required-food"]),
    "required-parent-signature": Boolean(safe["required-parent-signature"]),
    recoveryIssues: issues,
  };
}

// The one restore path for a whole-dataset backup (server/services/backupStore.js) -
// deliberately separate from importItems: import is strict/all-or-nothing
// and merges by id, this is best-effort/never-fails and replaces the whole
// active dataset with the backup's snapshot (so an item that existed when
// the backup was taken but doesn't anymore is restored, and one created
// since the backup - absent from it - is soft-deleted, the same as a normal
// deleteItem so it stays individually undo-able from history).
async function restoreAllFromBackup(backupItems) {
  if (!Array.isArray(backupItems)) {
    throw new Error("backup items must be an array");
  }
  const tag = activeDatasetFilter();
  const now = new Date().toISOString();
  const restored = [];
  const skipped = [];
  const keptIds = new Set();

  for (const raw of backupItems) {
    const sanitized = sanitizeBackupItem(raw);
    keptIds.add(sanitized.id);
    try {
      const record = {
        id: sanitized.id,
        ...tag,
        status: "active",
        ...fieldsFromInput(sanitized),
        createdAt: now,
        updatedAt: now,
      };
      const external = toExternalItem(record);
      const entry = makeHistoryEntry({
        op: "restore",
        itemId: record.id,
        title: record.title,
        before: null,
        after: external,
      });
      // createEvent's tx.set() creates-or-fully-overwrites by this exact id,
      // regardless of the doc's previous status - exactly "replace with the
      // backup's version" for both a never-existed and a since-deleted item.
      await getRepository().createEvent(record, entry, tag);
      restored.push(external);
    } catch (err) {
      // A write-level failure (not a data-shape one, already handled above
      // by sanitizeBackupItem) - this single item is skipped, not the whole
      // restore.
      console.error(`[timelineStore] Failed to restore backup item ${sanitized.id}:`, err.message);
      skipped.push({ id: sanitized.id, title: sanitized.title, error: err.message });
    }
  }

  const current = await getRepository().getActiveEvents(tag);
  for (const existing of current) {
    if (keptIds.has(existing.id)) continue;
    await getRepository().updateActiveEvent(existing.id, tag, (record) => {
      const before = toExternalItem(record);
      const entry = makeHistoryEntry({ op: "delete", itemId: existing.id, title: before.title, before, after: null });
      return { fields: { status: "deleted", updatedAt: new Date().toISOString() }, historyEntry: entry };
    });
  }

  console.log(`[timelineStore] Restored ${restored.length} item(s) from backup (${skipped.length} skipped)`);
  return { restored, skipped };
}

module.exports = {
  getAll,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  validateItemInput,
  importItems,
  restoreFromHistory,
  restoreAllFromBackup,
};
